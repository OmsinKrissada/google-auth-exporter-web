<script setup lang="ts">
import { ref } from 'vue';
import qrReader from 'qrcode-reader';
import { decode as decodeGoogleAuth, type Account } from './auth_decode';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';

const status = ref('No Activity');
const content = ref('');

const qrError = ref('');
function decodeQR(dataURI: string) {
  qrError.value = '';
  const qr = new qrReader();
  qr.callback = (error: string, result: { result: string, points: any; }) => {
    if (error) qrError.value = error;
    if (result) content.value = result.result;
    status.value = 'QR Decoded';
  };
  status.value = 'QR Decoding';
  qr.decode(dataURI);
}

const fileUpload = ref<HTMLInputElement>();
function handleUpload() {
  const file = fileUpload.value?.files;
  const reader = new FileReader();
  let decoded = '';
  reader.onload = evt => decoded = evt.target?.result as string;
  reader.onprogress = progress => status.value = `Uploading (${Math.round(progress.loaded / progress.total * 100)}%)`;
  reader.onloadstart = () => content.value = '';
  reader.onloadend = () => {
    status.value = 'Uploaded';
    decodeQR(decoded);
  };
  reader.readAsDataURL(file![0]);
}

function generateMarkdown(accounts: Account[]) {
  const rows = accounts.map(acc => `|${acc.name ?? '-'}|${acc.issuer ?? '-'}|\`${acc.totpSecret ?? '-'}\`|${acc.type.split('OTP_')[1]}|${acc.algorithm.split('ALGO_')[1]}|`);
  let str = `
  # Google Authenticator Export
  |Name|Issuer|OTP Secret|Type|Algorithm|
  |---|---|---|---|---|
  ${rows.join('\n')}
  `;
  return str;
}

const result = ref<any[]>([]);
const markdownPreview = ref<HTMLDivElement>();
const allowSave = ref(false);
const saveFunc = ref();
async function decode() {
  if (!content.value) {
    status.value = 'ERROR (No Input)';
    return;
  }
  const data = new URLSearchParams(new URL(content.value).search).get('data');
  if (!data) {
    status.value = 'ERROR (no data param)';
    return;
  }
  console.log('decoding');
  const accounts = await decodeGoogleAuth(data);
  result.value = accounts;
  // const pdf = await mdToPdf({ content: generateMarkdown(accounts) });
  // console.log(pdf.content);
  if (!markdownPreview.value) return;
  markdownPreview.value.innerHTML = marked(generateMarkdown(accounts));

  const doc = new jsPDF('l', 'mm', [210 * 5, 297 * 3]);
  // doc.setFontSize(8);
  doc.addFont('Segoe UI', 'Segoe UI', '');
  doc.setFont('Segoe UI');
  console.log(doc.getFont());
  console.log(doc.getFontList());
  doc.html(markdownPreview.value, {
    callback: function (doc) {
      saveFunc.value = doc.save;
      allowSave.value = true;
    },
    autoPaging: 'text',
  });
}
</script>

<template>
  <div class="min-h-screen p-5 flex flex-col space-y-3">

    <h1 class="font-bold text-xl">Extract TOTP secrets from Google Authenticator QR Code export.</h1>
    <p>Accepts QR Code image and OTP string (otpauth-migration://offline?data=...)</p>
    <p>Extraction logic is based on <a href="https://github.com/krissrex/google-authenticator-exporter" target="_blank"
        class="font-medium text-sky-600 underline">Kristian
        Rekstad's Node.js version</a>.</p>
    <p class="italic"><span class="underline">Note</span>: Save to PDF option is with poor formatting. I couldn't find
      any conversion libraries which
      support styling.
    </p>

    <br />

    <div class="flex flex-col space-y-3 border-2 p-4 border-gray-500 rounded-lg">
      <h1 class="mb-3 font-bold text-lg">Choose image file or paste text</h1>
      <input type="file" ref="fileUpload" accept="image" @change="handleUpload">
      <div class="flex flex-col justify-start">
        <p v-if="qrError" class="font-medium text-rose-600">
          <span class="font-medium text-black">QR Read Error:</span>
          {{ qrError }}
        </p>
      </div>
      <div class="flex flex-col justify-start">
        <label for="base64" class="font-medium">Data: </label>
        <textarea name="base64" id="base64" v-model="content" class="border p-2 border-black rounded overflow-visible"
          oninput='this.style.height = "";this.style.height = this.scrollHeight + "px"'></textarea>
      </div>

      <div class="flex items-center space-x-3">
        <button class="px-2 py-1 bg-indigo-200 font-medium border border-indigo-800 rounded" @click="decode">Extract
          Now</button>
      </div>
    </div>

    <div class="flex flex-col space-y-3 border-2 p-4 border-gray-500 rounded-lg">
      <h1 class="mb-3 font-bold text-lg">Output</h1>
      <p>
        <span class="font-medium">Status:</span>
        {{ status }}
      </p>
      <!-- <p>
        <span class="font-medium">Decoded Data:</span>
        {{ result }}
      </p> -->
      <button v-if="allowSave" @click="saveFunc" class="py-1 bg-gray-200 font-medium rounded">Save as PDF</button>
      <div ref="markdownPreview" class="markdown-body p-10 w-fit"></div>
      <!-- <canvas ref="markdownCanvas" class="markdown-body p-10" style="width: 210mm; height: 297mm"></canvas> -->
    </div>

  </div>
</template>
