<script setup lang="ts">
import { ref, toRaw, useTemplateRef, watch } from "vue";
import { FileParser, TIMParser } from "./ts/index";
import { DPParser } from "./ts/parser/dp";
import { ClutInfo, FileScribe, PixelInfo } from "./ts/types";
import { DPScribe } from "./ts/writer/dp";
import { TIMScribe } from "./ts/writer/tim";

let parser: FileParser;
let scribe: FileScribe<Object>;

const selPalette = ref(0);
const text = ref("");
const result = ref<{ palettes: ClutInfo[]; pxl: PixelInfo }>();
const canvas = useTemplateRef("canvas");

function selectParser(filename: string) {
  if (canvas.value) {
    const ext = filename.substring(filename.lastIndexOf("."));
    if (ext.match(/.tim/i)) {
      parser = new TIMParser();
      scribe = new TIMScribe(canvas.value);
    } else if (ext.match(/.dp/i)) {
      parser = new DPParser();
      scribe = new DPScribe(canvas.value);
    }
  }
}

async function parseFile(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files) {
    selectParser(files[0].name);
    console.log(`Parsing ${files[0].name} with ${parser.getName()}`);
    result.value = parser.parse(await files[0].arrayBuffer()) as any;
    console.log(toRaw(result.value));
  }
}

function drawTexture(data?: Object, pal: number = 0) {
  if (canvas.value && data) {
    scribe.write(data, pal);
  }
}

watch(result, (val) => {
  drawTexture(val);
  selPalette.value = 0;
});
watch(selPalette, (val) => drawTexture(result.value, val));
</script>

<template>
  <div id="ctrl-panel">
    <input type="file" id="file-upload" ref="fileUpload" @change="parseFile" />

    <div>
      <div><b>Palette</b></div>
      <label for="radio-0">0</label>
      <input type="radio" id="radio-0" value="0" v-model="selPalette" />
      <label for="radio-1">1</label>
      <input type="radio" id="radio-1" value="1" v-model="selPalette" />
      <label for="radio-2">2</label>
      <input type="radio" id="radio-2" value="2" v-model="selPalette" />
      <label for="radio-3">3</label>
      <input type="radio" id="radio-3" value="3" v-model="selPalette" />
    </div>
  </div>
  <br />
  <div>
    <canvas ref="canvas" id="my-canvas" width="128" height="128"></canvas>
  </div>
  <div v-for="(value, key) in result">{{ key }}: {{ value }}</div>
</template>

<style lang="scss">
#ctrl-panel {
  display: flex;
  //justify-content: center;
  align-items: center;
}

div {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11pt;
  white-space: pre;
}

canvas {
  background-color: black;
  border: solid 2px black;
}
</style>
