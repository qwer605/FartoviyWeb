YOLOv10n ONNX uint8 — COCO object detection

Source: https://huggingface.co/onnx-community/yolov10n
Upstream: https://github.com/THU-MIG/yolov10
Revision: 57657320425ee34056408a57ad9d29c4d4815bd8
File: onnx/model_uint8.onnx (renamed to yolov10n-uint8.onnx)
Download: https://huggingface.co/onnx-community/yolov10n/resolve/57657320425ee34056408a57ad9d29c4d4815bd8/onnx/model_uint8.onnx
SHA256: 85630e74204ebed54bf990274f45625bdaae4d46f179bf072b5fda3ccf36a42e
Size: 2,650,737 bytes
License: AGPL-3.0, included in LICENSE-YOLOv10.txt.

Input: float32 RGB NCHW [1, 3, 640, 640], values divided by 255.
Resize longest edge to 640, preserve aspect ratio, pad right/bottom with zero.
Output: [1, 300, 6] rows [x1, y1, x2, y2, confidence, COCO class ID].
The export includes end-to-end selection; do not apply YOLOv8-style NMS.

The browser uses ONNX Runtime Web's WASM backend in a dedicated worker,
with one WASM thread so GitHub Pages needs no COOP/COEP headers.
Weights and matching runtime files are hosted alongside the application.
This generic model does not recognize individual products or clothing SKUs.

Demo image (public/assets/vision-sample.jpg):
https://github.com/ultralytics/ultralytics/blob/main/ultralytics/assets/bus.jpg
From the Ultralytics repository (AGPL-3.0); license text included above.
