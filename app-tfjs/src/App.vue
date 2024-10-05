<template>
<div class="appMain">
  <div class="header">
    <img alt="kafka logo" class="logo" src="@/assets/kafka_avatar.jpg" width="90" height="90" />
    <div class="hitem">Tensorflow.js Demo</div>
   </div>
  <div class="content">
   <TensorflowJs />
  </div>
</div>

</template>

<script setup>
import TensorflowJs from "@/views/TensorflowJs.vue"

</script>

<style lang="scss">
@import "@/assets/scss/base.scss";

#app {
  width: 100%;
  height: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
  font-weight: normal;
  font-size: $font-size-medium !important;
  background-color: $color-site-bg;
}

.appMain {
  display: flex;
  flex-direction: column;
  padding: 0;
  justify-content: center;
  //background-color: #52b691;
  .header {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    padding: 1rem 0;
    //background-color: yellow;
    text-align: center;
    //justify-content: center;
    align-items: center;
    .logo {
      -webkit-border-radius: 50%;
      -moz-border-radius: 50%;
      -ms-border-radius: 50%;
      -o-border-radius: 50%;
      border-radius: 50%;
    }
    .hitem {
      margin: 0 1rem;
      font-weight: $font-size-bold;
      font-size: $font-weight-bold;
    }
  }
  
  .navbar {
    overflow: hidden;
    z-index: $layer-lv1;
    //background-color: #333;
    a {
      float: left;
      display: block;
      color: #f2f2f2;
      text-align: center;
      padding: 14px 14px;
      text-decoration: none;
      font-size: 14px;
      @include breakpoint-md {
        float: none;
        display: block;
        text-align: left;
      }
    }
  
    a:hover {
      background-color: #ddd;
      color: black;
    }
   
    a.active {
      background-color: #04AA6D;
      color: white;
    }
  
    &__nav-right {
      float: right;
      @include breakpoint-md {
        float: none;
      }
    }
  }

  .content {
    padding: 0px;
    width: 100%;
    min-height: 480px;
    text-align: center;
    justify-content: center;
    //background-color: #005336;

    /* 捲軸寬度及高度 */
    ::-webkit-scrollbar {
      width:  0.5rem;; /* Set the width of the scrollbar */
      height:  0.5rem;; /* Set the height of the scrollbar */
    }
    /* 軌道背景底色 */
    ::-webkit-scrollbar-track {
      background-color: #f0f0f0; /* Set the color of the track */
      border-radius: 5px; 
    }
    /* 滑桿顏色 */
    ::-webkit-scrollbar-thumb {
      background-color: #f8b930; /* Set the color of the thumb */
      border-radius: 5px; /* Set the border radius of the thumb */
    }
    /* 捲軸兩側頂端的按鈕 */
    //::-webkit-scrollbar-button {
    //  background-color: #2a08e9;
    //}
    /* 捲軸兩側頂端的按鈕滑鼠滑入時的顏色 */
    //::-webkit-scrollbar-button:hover {
    //  background-color: #3756e0;
    //}
  }
}

.container {
  background-color: #50a0ff;
  padding: 1rem;
  display: flex; // row | row-reverse | column | column-reverse;
  flex-direction: row;
  flex-wrap: wrap; // nowrap | wrap | wrap-reverse;
  justify-content: center; // flex-start | flex-end | center | space-between | space-around;
  align-items: center; // flex-start | flex-end | center | baseline | stretch;
  align-content: center; //flex-start | flex-end | center | space-between | space-around | stretch;
}
.conitem {
  width: 100px;
  margin: 0.5rem;
  padding: 0.5rem;
  background-color: #fff;
}

.padm1 {
  padding: 0.5rem;
  margin: 0.5rem;
}

[class*=' el-icon-lx'],
[class^='el-icon-lx'] {
	font-family: lx-iconfont !important;
}
</style>
