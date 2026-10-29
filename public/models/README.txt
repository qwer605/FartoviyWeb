YOLO26s-seg ONNX — COCO instance segmentation

Official source: https://github.com/ultralytics/assets/releases/tag/v8.4.0
Download: https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-seg.onnx
Documentation: https://docs.ultralytics.com/tasks/segment/
SHA256: d205b2c489e7cf0cdb183bb23e56dc8a32a79602e8c5b1f5ecb01af0dc6822c3
Size: 41,912,273 bytes
License: AGPL-3.0, included in LICENSE-YOLO.txt.

Input: float32 RGB NCHW [1, 3, 640, 640], values divided by 255.
Preserve aspect ratio; resize longest edge to 640; centered letterbox padding RGB 114.
Output 0: [1, 300, 38], rows [x1, y1, x2, y2, confidence, COCO class ID, 32 mask coefficients].
Output 1: [1, 32, 160, 160], channel-first mask prototypes.
The pinned export uses end-to-end selection: do not apply YOLOv8-style NMS.
Instance mask = sigmoid(coefficients * prototypes) > 0.5, cropped to predicted box.
Remove the same centered padding when mapping coordinates and masks onto the photo.

ONNX Runtime Web WASM runs in a dedicated worker with one WASM thread.
Weights and runtime are hosted with the application; GitHub Pages needs no COOP/COEP.
Photos stay on the user's device.

The default pattern mode checks up to eight deduplicated handbag/backpack/suitcase/tie
mask proposals. "tie" is included because some side-view bags are misclassified as ties.
Source class labels remain unchanged. The geometric checker-texture verifier runs
only inside a proposal mask; a match is not a bag/brand/SKU/authenticity classifier.
Different textures may match; missing proposals cannot be recovered by stage two.
Confidence and texture coverage are separate quantities and are labeled separately.

Demo image (public/assets/vision-sample.jpg):
https://github.com/ultralytics/ultralytics/blob/main/ultralytics/assets/bus.jpg
From the Ultralytics repository (AGPL-3.0); license text included above.
