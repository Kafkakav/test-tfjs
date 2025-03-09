<template>
<div class="common-layout">
  <el-row>
    <el-col :span="24">
      <el-radio-group v-model="srcImageFrame" @change="handleInputChange">
      <el-radio value="pic" size="large">上傳圖片</el-radio>
      <el-radio value="cam" size="large">Livecam</el-radio>
    </el-radio-group>
    </el-col>
  </el-row>  

  <el-row class="padm1" v-if="srcImageFrame=='pic'">
    <el-col :span="24">
      <el-upload
        class="avatar-uploader"
        action="#"
        :show-file-list="false"
        :on-change="handleImageChange"
        :before-upload="beforeImageUpload"
        :auto-upload="false"
      >
        <img ref="refImage" v-if="imageUrl" :src="imageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><icon-ep-plus /></el-icon>
      </el-upload>
      <div>請選擇圖片</div>
    </el-col>
  </el-row>

  <el-row class="padm1" v-if="srcImageFrame=='cam'">
    <el-col :span="24">
      <div style="margin: 10px 0;">
        <el-select v-model="selectedCameraIdx" placeholder="Select Camera" style="width: 240px">
          <el-option v-for="item in CameraList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </el-col>
  </el-row>

  <el-row v-if="srcImageFrame=='cam'">
    <el-col :span="24">
      <div style="margin: 10px 0;">
        <el-button type="primary" round style="width:200px;" @click="open_camera">開啟camera</el-button>
        <el-button type="primary" round style="width:200px;" @click="close_camera">關閉camera</el-button>
      </div>
    </el-col>
  </el-row>

  <el-row>
    <el-col :span="24">
      <div style="margin: 10px 0;">
        <el-select v-model="selectedModel" placeholder="Select Model" style="width: 240px">
          <el-option v-for="item in modelOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div style="margin: 10px 0;">
        <el-button type="primary" round style="width:200px;" @click="canvas_image_onload">圖片辨識</el-button>
      </div>
      <canvas ref="refCanvas"></canvas>
      <div><pre style="text-align: left;">{{ predictResults }}</pre></div>

      <video ref="refVideo" playsinline style="
          -webkit-transform: scaleX(-1);
          transform: scaleX(-1);
          visibility: hidden;
          width: auto;
          height: auto;">
      </video>

    </el-col>
  </el-row>

  <el-row class="padm1" v-if="false">
    <el-col class="padm1" :span="24">
      <div class="container">
        <div class="conitem">a</div>
        <div class="conitem">b</div>
        <div class="conitem">c </div>
      </div>
    </el-col>
  </el-row>

</div>

</template>

<script setup>
//pnpm install @tensorflow/tfjs
import { onBeforeMount, onMounted, onBeforeUnmount, ref} from "vue";
import { ElMessage } from 'element-plus'

let modelMobileNet = null;
let modelHandDetector = null;
let modelCocoSSD = null;
//let modelFaceLMD = null; // Face Landmark Detection
const modelOptions = ref([
  {label:"MobileNet 圖片分類", value:"MobileNet", loadmodel:loadmodel_mobilenet, predict:predict_mobilenet},
  {label:"Coco-SSD 物件辨識", value:"CocoSSD",    loadmodel:loadmodel_cocossd, predict:predict_cocossd},
  {label:"MediaPipe Hands 手勢辨識", value:"Hand", loadmodel:loadmodel_hand, predict:predict_hand},
]);

const CameraList = ref([
  {label:"No Camera found", value:0},
]);

const srcImageFrame = ref('pic')
const imageUrl = ref('')
const refImage = ref(null)
const refVideo = ref(null)
const refCanvas = ref(null)
let ctxCanvas;
const mirrorImage = ref(1)
const predictResults = ref("");
const selectedModel = ref("MobileNet");
const selectedCameraIdx = ref(null);
let myCam = undefined;

function find_model_option(selModel) {
  for(let i=0; i< modelOptions.value.length; i++) {
    if(selModel ===  modelOptions.value[i].value)
      return modelOptions.value[i];
  }
  return null;
}

const handleImageChange = (uploadFile) => {
  //console.log("handleImageChange...", uploadFile);
  if(!beforeImageUpload(uploadFile.raw))
    return;
  /*
    let tgtImg = document.getElementById('SnapshotImage');
    let dataURL = canvas.toDataURL('image/png');
    tgtImg.src = dataURL;
  */
  imageUrl.value = URL.createObjectURL(uploadFile.raw)
}
const beforeImageUpload = (rawFile) => {
  console.log("beforeImageUpload...", rawFile);
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png' && rawFile.type !== 'image/bmp') {
    ElMessage.error('圖片只支援 JPG, PNG 格式!')
    return false
  } else if (rawFile.size / 1024 / 1024 > 5) { // 5MB
    ElMessage.error('圖片大小不能超過5MB!')
    return false
  }
  return true
}

const canvas_image_onload = () => {

  if(srcImageFrame.value == 'cam') {
    predictResults.value = "";
    loadModel(selectedModel.value).then(async () => {
      predictResults.value = "模型載入成功";    
    })

    return
  }

  ctxCanvas = refCanvas.value.getContext("2d");
  if(!refImage.value) return;

  let hRatio = 480 / refImage.value.width;
  let vRatio = 1; //360 / refImage.value.height;
  let ratio  = Math.min( hRatio, vRatio );

  refCanvas.value.setAttribute("width", refImage.value.width*ratio);
  refCanvas.value.setAttribute("height", refImage.value.height*ratio);
  ctxCanvas.clearRect(0, 0, refCanvas.value.width, refCanvas.value.height);

  let centerShift_x = Math.floor(( refCanvas.value.width - refImage.value.width*ratio ) / 2);
  let centerShift_y = Math.floor(( refCanvas.value.height - refImage.value.height*ratio ) / 2);

  //console.log("canvas_image_onload: ratio=", ratio)
  //console.log("canvas_image_onload: W x H=", refCanvas.value.width, refCanvas.value.height)

  if (mirrorImage.value==1) {
    // 改變做畫時的原點(offxdtX, offsetY)
    //ctxCanvas.translate((refCanvas.value.width + refImage.value.width) / 2, 0);
    ctxCanvas.translate(refCanvas.value.width, 0);
    //scales the canvas horizontally by -1 and vertically by 1. 
    //Scaling by -1 horizontally effectively flips the image horizontally, resulting in a mirror effect
    ctxCanvas.scale(-1, 1);
    //ctxCanvas.drawImage(refImage.value, 0, 0, refImage.value.width, refImage.value.height);
    ctxCanvas.drawImage(refImage.value, centerShift_x, centerShift_y, refCanvas.value.width, refCanvas.value.height); 
  
    // resets the transformation matrix of the canvas to its default state
    ctxCanvas.setTransform(1, 0, 0, 1, 0, 0);
  }
  else {
    ctxCanvas.drawImage(refImage.value, centerShift_x, centerShift_y, refCanvas.value.width, refCanvas.value.height);  
  }
  
  predictResults.value = "";
  loadModel(selectedModel.value).then(async () => {
    await predictImage(selectedModel.value);
    
  })
}

/* ********************************************************************************************
*
*
******************************************************************************************** */
async function loadmodel_mobilenet() {
  if(modelMobileNet) return Promise.resolve(modelMobileNet)
  const version = 2;
  const alpha = 0.5;
  predictResults.value = "MobileNet 模型載入中,請稍後...";
  modelMobileNet = await window.mobilenet.load({version, alpha});
  return Promise.resolve(modelMobileNet);
}
async function predict_mobilenet(canvas) {
  if(!modelMobileNet) return;
  predictResults.value = "辨識中...";

  // Classify the image.
  const predictions = await modelMobileNet.classify(canvas);
  //console.log('Predictions');
  //console.log(predictions);
  predictResults.value = "";
  if(predictions && predictions.length > 0) {
    // predictResults.value = JSON.stringify(predictions, null, 2); //.replace(/\n/g, '<br>')
    for(let i=0; i<predictions.length; i++) {
      predictResults.value += `[${predictions[i].className}]:${predictions[i].probability}\n`
    }
  }
  else {
    predictResults.value = "無法辨識"
  }
  /*
  import '@tensorflow/tfjs-backend-cpu';
  import '@tensorflow/tfjs-backend-webgl';

  // Get the logits.
  const logits = modelMobileNet.infer(canvas);
  console.log('Logits');
  logits.print(true);

  // Get the embedding.
  const embedding = modelMobileNet.infer(canvas, true);
  console.log('Embedding');
  embedding.print(true);
*/
}
/* ********************************************************************************************
*
*
******************************************************************************************** */
async function loadmodel_cocossd() {
  if(modelCocoSSD) return Promise.resolve(modelCocoSSD)
  predictResults.value = "coco-ssd 模型載入中,請稍後...";
  modelCocoSSD = await window.cocoSsd.load();
  return Promise.resolve(modelCocoSSD);
}

async function predict_cocossd(canvas) {
  if(!modelCocoSSD) return;
  predictResults.value = "辨識中...";


  modelCocoSSD.detect(canvas).then(Predictions => {    
    let sz = (canvas.width > canvas.height)?canvas.width:canvas.height;
    let context = canvas.getContext("2d");
    if (Predictions.length > 0) {
      predictResults.value = "";
      for (let i=0; i<Predictions.length; i++) {
        const x = Predictions[i].bbox[0];
        const y = Predictions[i].bbox[1];
        const width = Predictions[i].bbox[2];
        const height = Predictions[i].bbox[3];
        context.lineWidth = Math.round(sz/200);
        context.strokeStyle = "#00FFFF";
        context.beginPath();
        context.rect(x, y, width, height);
        context.stroke(); 
        context.lineWidth = "2";
        context.fillStyle = "red";
        context.font = Math.round(sz/30) + "px Arial";
        context.fillText(Predictions[i].class, x, y);
        //context.fillText(i, x, y);
        predictResults.value += "["+i+"] "+Predictions[i].class+", "+Math.round(Predictions[i].score*100)+"%, ("+Math.round(x)+", "+Math.round(y)+", "+Math.round(width)+", "+Math.round(height)+")\n";
      }
    }
    else {
      predictResults.value = "無辨識物件";
    }
  });
}
/* ********************************************************************************************
*
*
******************************************************************************************** */
async function loadmodel_hand() {
  if(modelHandDetector) return Promise.resolve(modelHandDetector);
  predictResults.value = "Mediapipe.Hands 模型載入中,請稍後...";
  let model = window.handPoseDetection.SupportedModels.MediaPipeHands;
  let detectorConfig = {
    runtime: 'tfjs', // 'mediapipe' or 'tfjs'
    maxHands: 1,
    modelType: 'lite', //'full'
    //solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
  };
  modelHandDetector = await window.handPoseDetection.createDetector(model, detectorConfig);
  //.then(dt => {
  //  ModelHandDetector = dt;
  //  result.innerHTML = "";
  //  HandGesture = 1;
  //})
  //console.log("loadmodel_hand", modelHandDetector);
  return Promise.resolve(modelHandDetector);
}
async function predict_hand(canvas) {
  if(!modelHandDetector) return;
  predictResults.value = "辨識中...";

  let context = canvas.getContext("2d");
  let doHandMathChecked = 1;
  const estimationConfig = {flipHorizontal: false};
  predictResults.value = "";
  modelHandDetector.estimateHands(canvas, estimationConfig).then((hands) => {
    if(!hands || hands.length == 0) {
      return;
    }
    //console.log("HandPose:", hands);
    let handedness, gestures;
    for(let h=0; h<hands.length; h++) {
      gestures = "";
      handedness = hands[h].handedness == "Right"?"右手":"左手";
      let fingers_angle = hand_angle(hands[h].keypoints);
      if(fingers_angle && fingers_angle.length == 5) {
        gestures = hand_pos(fingers_angle); 
       //console.log("gestures:", gestures);
      }
      predictResults.value += `[${h}] ${handedness},${Math.round(hands[h].score*100)}% 手勢: ${gestures}\n`
      if(gestures.length > 0) {
        context.fillStyle = "white";
        context.font = "40px Arial";
        let cxtText = gestures;  
        if(doHandMathChecked > 0) {
          let num = parseInt(gestures);
          if( num > 0 ) {
            cxtText = `3 +   = ${3+num}`;
          }
        }
        context.fillText(cxtText, 20, canvas.height/2-40);
      }
    }
  }).catch(e =>{
    console.log(e);
    predictResults.value = "無法辨識";
    modelHandDetector.dispose();
    modelHandDetector = null;
  }).finally(()=>{
    //predictResults.value = "無法辨識";
  });
}

/* ********************************************************************************************
*
*
******************************************************************************************** */
async function loadModel(selModel) {
  let modelOp = find_model_option(selModel)
  if(!modelOp) {
    Promise.reject(null);
    return;
  }
  return await modelOp.loadmodel()
}
async function predictImage(selModel) {
  let modelOp = find_model_option(selModel)
  if(!modelOp) {
    Promise.reject(null);
    return;
  }
  await modelOp.predict(refCanvas.value)
}

/* ********************************************************************************************
*
*
******************************************************************************************** */
function vector_2d_angle(v1, v2) {
  let v1_x = v1[0];
  let v1_y = v1[1];
  let v2_x = v2[0];
  let v2_y = v2[1];
  let angle_, angle_degrees;
  try {
    angle_ = Math.acos((v1_x*v2_x + v1_y*v2_y) / (Math.sqrt(v1_x**2 + v1_y**2) * Math.sqrt(v2_x**2 + v2_y**2)));
    angle_degrees = (180/Math.PI) * angle_;
  } catch (error) {
    angle_degrees = 180;
  }
  return angle_degrees;
}

function hand_angle(hand_) {
  let angle_list = [];
  //thumb
  let angle_ = vector_2d_angle(
    [hand_[0].x - hand_[2].x, hand_[0].y - hand_[2].y],
    [hand_[3].x - hand_[4].x, hand_[3].y - hand_[4].y]);
  angle_list.push(angle_);
  //index
  angle_ = vector_2d_angle(
    [hand_[0].x - hand_[6].x, hand_[0].y - hand_[6].y],
    [hand_[7].x - hand_[8].x, hand_[7].y - hand_[8].y]);
  angle_list.push(angle_);
  //middle
  angle_ = vector_2d_angle(
    [hand_[0].x - hand_[10].x, hand_[0].y - hand_[10].y],
    [hand_[11].x - hand_[12].x, hand_[11].y - hand_[12].y]);
  angle_list.push(angle_);
  //ring
  angle_ = vector_2d_angle(
    [hand_[0].x - hand_[14].x, hand_[0].y - hand_[14].y],
    [hand_[15].x - hand_[16].x, hand_[15].y - hand_[16].y]);
  angle_list.push(angle_);
  //pink
  angle_ = vector_2d_angle(
    [hand_[0].x - hand_[18].x, hand_[0].y - hand_[18].y],
    [hand_[19].x - hand_[20].x, hand_[19].y - hand_[20].y]);
  angle_list.push(angle_);
  return angle_list;
}
function hand_pos(finger_angle) {
  let f1 = finger_angle[0];
  let f2 = finger_angle[1];
  let f3 = finger_angle[2];
  let f4 = finger_angle[3];
  let f5 = finger_angle[4];

  if (f1 < 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) {
    return 'good';
  } else if (f1 >= 50 && f2 >= 50 && f3 < 50 && f4 >= 50 && f5 >= 50) {
    return 'no!!!';
  } else if (f1 < 50 && f2 < 50 && f3 >= 50 && f4 >= 50 && f5 < 50) {
    return 'ROCK!';
  } else if (f1 >= 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) {
    return '0';
  } else if (f1 >= 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 < 50) {
    return 'pink';
  } else if (f1 >= 50 && f2 < 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) {
    return '1';
  } else if (f1 >= 50 && f2 < 50 && f3 < 50 && f4 >= 50 && f5 >= 50) {
    return '2';
  } else if (f1 >= 50 && f2 >= 50 && f3 < 50 && f4 < 50 && f5 < 50) {
    return 'ok';
  } else if (f1 < 50 && f2 >= 50 && f3 < 50 && f4 < 50 && f5 < 50) {
    return 'ok';
  } else if (f1 >= 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 > 50) {
    return '3';
  } else if (f1 >= 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 < 50) {
    return '4';
  } else if (f1 < 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 < 50) {
    return '5';
  } else if (f1 < 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 < 50) {
    return '6';
  } else if (f1 < 50 && f2 < 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) {
    return '7';
  } else if (f1 < 50 && f2 < 50 && f3 < 50 && f4 >= 50 && f5 >= 50) {
    return '8';
  } else if (f1 < 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 >= 50) {
    return '9';
  } else {
    return '';
  }
}

onBeforeMount(() => {
  //loadModel()
})
onMounted(async () => {

})
onBeforeUnmount(() => {
  //console.log("app.onMounted")
})
const handleInputChange = () => {
  if(srcImageFrame.value == 'cam') {
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(() => {
      return navigator.mediaDevices.enumerateDevices();
    })
    .then(devices => {
      const cameras = devices.filter(device => device.kind === 'videoinput');
      if(cameras.length > 0) {
        CameraList.value = []
      }
      cameras.forEach((camera, index) => {
        let label = `Camera ${index + 1}: ${camera.label || "noname"}`;
        console.log(label);
        CameraList.value.push({label: label, value: index+1, deviceId: camera.deviceId})
      });
      close_camera();
    })
    .catch(error => {
      console.error('Error accessing media devices:', error);
    });

  }
}

async function timer_camera(cam) {
  if(!myCam) return;

  cam.drawCtx();
  await predictImage(selectedModel.value);
  setTimeout(timer_camera, 100, cam)
}

function open_camera() {
  if(myCam) {
    alert("摄影鏡頭已啟動,若要重啟請先關閉")
    return;
  }
  if(selectedCameraIdx.value <=0 || selectedCameraIdx.value > CameraList.value.length) {
    alert("請重新選擇摄影鏡頭")
    return;
  }

  let camIdx = parseInt(selectedCameraIdx.value) -1
  console.log("open_camera:", camIdx)
  MyCamera.setupCamera(null, CameraList.value[camIdx].deviceId).then(function(cam) {
    myCam = cam;
    setTimeout(timer_camera, 100, myCam)
  }).catch(function(err){
    console.log('open_camera Error:', err.message, err.name);
  });
}

function close_camera() {
  if(!myCam) return;
  MyCamera.close_stream(myCam)
  myCam = undefined;
  refVideo.value.srcObject = null;
}

class MyCamera {

  constructor() {
    this.video = refVideo.value;
    this.canvas = refCanvas.value;
    this.ctx = this.canvas.getContext('2d');
    this.stream = undefined;
  }

  static async list_camera_devices() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      return cameras || []
    } 
    catch (error) {
      console.error('Error accessing media devices:', error);
      return []
    }
  }

  static get_camparams(type) {
    if(type == "VIDEO_SIZE") {
      return {
        VIDEO_SIZE: {
          '640 X 480': {width: 640, height: 480},
          '640 X 360': {width: 640, height: 360},
          '360 X 270': {width: 360, height: 270}
        }
      };
    }
    else if(type == "STATE") {
      const STATE = {
        camera: {targetFPS: 30, sizeOption: '640 X 480'},
        backend: '',
        flags: {},
        modelConfig: {}
      }
      return STATE;
    }
    return null;
  }
  static isMobile() {
    return true;
  }

  static close_stream(cam) {
    // 將所有的 MediaStreamTrack 都關閉
    cam.stream.getTracks().forEach(function(track) {
      track.stop();
      console.log("close_stream: track.stop") 
    })
    cam.stream = undefined;
  }

  static async setupCamera(cameraParam, deviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
          'Browser API navigator.mediaDevices.getUserMedia not available');
    }
    const params = MyCamera.get_camparams("VIDEO_SIZE");
    if(!cameraParam) {
      cameraParam = MyCamera.get_camparams("STATE");
    }

    const {targetFPS, sizeOption} = cameraParam;
    const _size = params.VIDEO_SIZE[sizeOption];
    const videoConfig = {
      'audio': false,
      'video': {
        video: { deviceId: { exact: deviceId } },
        // facingMode: 'user',
        // Performance issue: Only setting the video to a specified size for large screen, on
        // mobile devices accept the default size.
        width: MyCamera.isMobile() ? params.VIDEO_SIZE['360 X 270'].width : _size.width,
        height: MyCamera.isMobile() ? params.VIDEO_SIZE['360 X 270'].height : _size.height,
        frameRate: {
          ideal: targetFPS,
        }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig);
    const camera = new MyCamera();
    camera.video.srcObject = stream;
    camera.stream = stream;

    await new Promise((resolve) => {
      camera.video.onloadedmetadata = (event) => {
        resolve(event);
      };
    });

    camera.video.play();

    const videoWidth = camera.video.videoWidth;
    const videoHeight = camera.video.videoHeight;
    // Must set below two lines, otherwise video element doesn't show.
    camera.video.width = videoWidth;
    camera.video.height = videoHeight;

    camera.canvas.width = videoWidth;
    camera.canvas.height = videoHeight;

    //const canvasContainer = document.querySelector('.canvas-wrapper');
    //canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    // Because the image from camera is mirrored, need to flip horizontally.
    //camera.ctx.translate(camera.video.videoWidth, 0);
    //camera.ctx.scale(-1, 1);
/*
    for (const ctxt of [scatterGLCtxtLeftHand, scatterGLCtxtRightHand]) {
      ctxt.scatterGLEl.style =
          `width: ${videoWidth / 2}px; height: ${videoHeight / 2}px;`;
      ctxt.scatterGL.resize();

      ctxt.scatterGLEl.style.display =
          params.STATE.modelConfig.render3D ? 'inline-block' : 'none';
    }
*/
    console.log("setupCamera:", camera.video.srcObject);
    return camera;
  }

  // take a picture
  drawCtx() {
    this.ctx.translate(refCanvas.value.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(
      this.video, 0, 0, this.video.videoWidth, this.video.videoHeight);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  clearCtx() {
    this.ctx.clearRect(0, 0, this.video.videoWidth, this.video.videoHeight);
  }

  drawImage(img) {
    this.ctx.drawImage(
      img, 0, 0, this.video.videoWidth, this.video.videoHeight);
  }

}

</script>

<style scoped>
.avatar-uploader .avatar {
  width: 100%;
  max-width: 480px;
  object-fit: contain;
  display: block;
}
</style>

<style >
.avatar-uploader .el-upload {
  border: 3px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 320px;
  height: 240px;
  text-align: center;
}
</style>
