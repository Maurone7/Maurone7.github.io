# Maurone7.github.io

Personal website of Mauro Patimo — Ph.D. student in Aerospace Engineering at Penn State.

Plain HTML/CSS/JS, served by GitHub Pages. No build step.

## Adding media
- **System video:** save as `assets/video/system.mp4` (H.264 MP4, keep under ~50 MB; GitHub rejects files over 100 MB), then remove the `hidden` attribute from `<figure id="video-card">` in `index.html`. The video and 3D model then appear side by side.
- **3D model:** `assets/models/system.glb` (glTF binary, Draco-compressed). It was converted from the Fusion STEP export; to update it, re-export and convert again.

## Preview locally
    python3 -m http.server 8000   # then open http://localhost:8000
