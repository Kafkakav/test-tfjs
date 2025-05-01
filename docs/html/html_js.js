function handleClick(target) {
    if(target == "others") {
      window.location = "/test-tfjs"
      return
    }
    window.location = `/test-tfjs/html/${target}.html`
}

var videoDevices = [];
var currentFacingMode = 'user'; // 'user' 前置鏡頭 | 'environment' 後置鏡頭

async function list_camera_devices() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    //devices.forEach((device, index) => {
    //  console.log(`device:${index}:`, device);
    //});
    const cameras = devices.filter(device => device.kind === 'videoinput');
    return cameras || []
  } 
  catch (error) {
    console.error('Error accessing media devices:', error);
    return []
  }
}
async function getCameraResolutions(opt, myTextLog) {
  try {
    videoDevices = await list_camera_devices()
    if (videoDevices.length === 0) {
      console.log('Camera not found');
      return;
    }
    videoDevices.forEach((camera, index) => {
      console.log(`${index}. ${camera.label || "na"}`);
    });
    myTextLog.value = JSON.stringify(videoDevices, null, 2);
    
    // 獲取支持的約束條件
    const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    console.log('supportedConstraints:', supportedConstraints);
    /*    
    // 測試不同解析度
    const resolutions = [
      { width: 640, height: 480 },
      { width: 800, height: 600 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 3840, height: 2160 },
      { width: opt.width, height: opt.height }
    ];
    
    for (const res of resolutions) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ //constraints 
          video: {
            facingMode: { ideal: currentFacingMode },
            width: { ideal: res.width },
            height: { ideal: res.height }
          }
        });
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        myTextLog.value += `成功獲取解析度: ${settings.width}x${settings.height}\n`
        track.stop();
      } catch (err) {
        myTextLog.value += `不支援解析度: ${settings.width}x${settings.height}\n`
      }
    }
    */
  } catch (error) {
    console.error('獲取相機資訊錯誤:', error);
  }

}

function startCamera(video1, opt, frameCB) {
  const camera = new Camera(video1, {
    'audio': false,
    'video': {
      facingMode: opt.facingMode || currentFacingMode,
      width: opt.width || 480,
      height: opt.height || 320,
      frameRate: {
        ideal: 30,
      }
    },
    onFrame: async () => {
      await frameCB(video1)
    }
  });
  console.log('攝影機已取得');
  return camera
}

function stopCamera(camera) {
  if (camera && camera.video) {
    const stream = camera.video.srcObject; // 獲取媒體流
    if (stream) {
      const tracks = stream.getTracks(); // 獲取所有軌道
      tracks.forEach(track => track.stop()); // 停止每個軌道
    }
    camera.video.srcObject = null; // 釋放 <video> 元素的媒體流
  }

  // 如果 Camera 類有 stop 方法，也可以直接調用
  if (camera && typeof camera.stop === 'function') {
    camera.stop();
  }
  console.log('攝影機已停止');
}

function switchCamera() {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
}

function getCanvasDisplaySize(canvasElm) {
  const parent = canvasElm.parentElement;
  const parentStyle = window.getComputedStyle(parent);
  
  // 計算扣除 padding 後的可用空間
  const paddingX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
  const paddingY = parseFloat(parentStyle.paddingTop) + parseFloat(parentStyle.paddingBottom);
  
  return {
    width: parent.clientWidth - paddingX,
    height: parent.clientHeight - paddingY
  };
}
function updateCanvasSize(canvasElm) {
  const { width, height } = getCanvasDisplaySize(canvasElm);
  canvasElm.width = width;
  canvasElm.height = height;
}
function screenOrientation() {
  if( window.innerHeight > window.innerWidth)
    return "portrait";
  return "landscape";
}
