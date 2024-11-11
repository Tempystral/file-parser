<script setup lang="ts">

import { ref, useTemplateRef } from "vue";
import { parse } from "./ts/index";

const file = ref<File>();

async function parseFile(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files) {
    console.log(parse(await files[0].arrayBuffer()));
  }
}

/* const fileElement = useTemplateRef("fileUpload");
if (fileElement.value) {
  fileElement.value.addEventListener("change", async (event) => {
  
});
} */


</script>

<template>
  <input type="file" id="file-upload" ref="fileUpload" @change="parseFile" />
</template>

<style></style>
