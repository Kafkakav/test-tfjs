<template>
<div class="common-layout">
  <el-row class="padm1">
    <el-col :span="12">
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
    <el-col :span="12">
      <canvas ref="refCanvas"></canvas>
      <div style="text-align: left;"><pre>{{ predictResults }}</pre></div>
    </el-col>
  </el-row>

  <el-row class="padm1">
    <el-col class="padm1" :span="24">
      <div class="container">
        <div class="conitem">
          <el-button type="primary" round @click="canvas_image_onload">load canvas</el-button>
        </div>
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
import * as tf from '@tensorflow/tfjs';

let model; 
let labels;
let labelsArray;

const imageUrl = ref('')
const refImage = ref(null)
const refCanvas = ref(null);
let ctxCanvas;
const mirrorImage = ref(1)
const predictResults = ref("");

const handleImageChange = (uploadFile) => {
  console.log("handleImageChange...", uploadFile);
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
  } else if (rawFile.size / 1024 / 1024 > 2) { // 2MB
    ElMessage.error('圖片大小不能超過2MB!')
    return false
  }
  return true
}

const canvas_image_onload = () => {
  ctxCanvas = refCanvas.value.getContext("2d");
  if(!refImage.value) return;

  let hRatio = 480 / refImage.value.width;
  let vRatio = 1; //360 / refImage.value.height;
  let ratio  = Math.min( hRatio, vRatio );

  refCanvas.value.setAttribute("width", refImage.value.width*ratio);
  refCanvas.value.setAttribute("height", refImage.value.height*ratio);

  let centerShift_x = Math.floor(( refCanvas.value.width - refImage.value.width*ratio ) / 2);
  let centerShift_y = Math.floor(( refCanvas.value.height - refImage.value.height*ratio ) / 2);  
  ctxCanvas.clearRect(0, 0, refCanvas.value.width, refCanvas.value.height);
  console.log("canvas_image_onload: ratio=", ratio)
  console.log("canvas_image_onload: W x H=", refCanvas.value.width, refCanvas.value.height)

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
  
  predictResults.value = "辨識中...";
  let selectedModel = "feature-vector";
  loadModel(selectedModel).then(async () => {

    if(selectedModel == "feature-vector") {
      let results = await featureVectorImage(refCanvas.value);
      console.log("results:", results)
      if(results && results.length > 0) {
        predictResults.value = JSON.stringify(results, null, 2); //.replace(/\n/g, '<br>')
      }
      else {
        predictResults.value = "無法辨識"
      }
    }
    else {
      let results = await classifyImage(refCanvas.value);
      console.log("results:", results)
      if(results && results.length > 0) {
        predictResults.value = JSON.stringify(results, null, 2); //.replace(/\n/g, '<br>')
      }
      else {
        predictResults.value = "無法辨識"
      }
  
    }
    
  })
}

async function classifyImage(image) {
  // 1. Convert Input Image to Tensor and Preprocess
  const imgTensor = tf.browser.fromPixels(image)  // Convert the image to a Tensor
    .resizeNearestNeighbor([128, 128])  // Resize the image to 128x128 dimensions
    .toFloat()  // Convert Tensor values to floating-point numbers
    .div(tf.scalar(255))  // Normalization: Scale pixel values from [0, 255] to [0, 1]
    .expandDims();  // Expand the Tensor dimension
  // 2. Classify the Image with the Model
  const predictions = await model.predict(imgTensor);  // Classify the image using the model
  // 3. Determine and Sort the Top Probability Classes
  const topPredictions = Array.from(predictions.dataSync())  // Convert from Tensor to JavaScript array
    .map((probability, index) => ({ probability, label: labelsArray[index]}))  // Match probability and label for each class
    .sort((a, b) => b.probability - a.probability)  // Sort by probability
    .slice(0, 3);  // Select the top three classes with the highest probabilities
  // 4. Return the Results
  return topPredictions;  // Return an array containing the top probable classes
}

async function featureVectorImage(image) {
  // 1. Convert Input Image to Tensor and Preprocess
  const imgTensor = tf.browser.fromPixels(image)  // Convert the image to a Tensor
    .resizeNearestNeighbor([128, 128])  // Resize the image to 128x128 dimensions
    .toFloat()  // Convert Tensor values to floating-point numbers
    .div(tf.scalar(255))  // Normalization: Scale pixel values from [0, 255] to [0, 1]
    .expandDims();  // Expand the Tensor dimension
  // 2. Classify the Image with the Model
  const prediction = await model.predict(imgTensor);  // Classify the image using the model
  console.log("prediction:", prediction)
  // Do something with the feature vector, e.g., classify the image
  const classIndex = prediction.argMax().dataSync()[0];
  console.log('Predicted class:', classIndex);
  return prediction;  // Return an array containing the top probable classes
}

async function loadModel(selModel) {

  if(selModel == "feature-vector") {
    model = await tf.loadGraphModel("/models/mobilenet-v2-tfjs-035-128-feature-vector-v3/model.json")

  }
  else {
    // load model using tf.loadGraphModel from Kaggle-MobileNet-v2 by Google.
    //model = await tf.loadGraphModel("<https://www.kaggle.com/models/google/mobilenet-v2/frameworks/TfJs/variations/035-128-classification/versions/3>", { fromTFHub: true })
    model = await tf.loadGraphModel("/models/mobilenet-v2-tfjs-035-128-classification-v3/model.json")
    // fetch the labels of the ImageNet data and convert it into a text format
    //labels = await fetch("<https://storage.googleapis.com/download.tensorflow.org/data/ImageNetLabels.txt>")
    labels = await fetch("/models/ImageNetLabels.txt").then((res) => res.text())
    // transform this text data into an array and assign it to the variable labelsArray
    labelsArray = labels.split('\n').map(label => label.trim()).filter(label => label !== '');
    //console.log("labelArray:", labelsArray)
  }
 
/*
const img = document.getElementById('myimg');
const tfImg = tf.fromPixels(img);
const smalImg = tf.image.resizeBilinear(tfImg, [368, 432]);
const resized = tf.cast(smalImg, 'float32');
const t4d = tf.tensor4d(Array.from(resized.dataSync()),[1,368,432,3])
*/
}


onBeforeMount(() => {
  //loadModel()
})
onMounted(() => {
    
})
onBeforeUnmount(() => {
  //console.log("app.onMounted")
})
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
