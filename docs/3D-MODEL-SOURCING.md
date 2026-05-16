# 3D Model Sourcing Guide

A practical guide for finding real 3D model files of furniture and products to use in Room CAD Renderer.

> **Note:** Uploading 3D models is a planned future feature, not shipped yet. Right now the app uses simple textured boxes as 3D placeholders for products. When custom 3D model upload ships, this guide is what you'll use to find the actual shapes — couches that look like couches, lamps that look like lamps, instead of generic boxes.

---

## What is a 3D model file?

A 3D model file describes the shape of a real-world object in three dimensions — every curve, edge, and surface — so a computer can render it from any angle.

Two file types you'll see most often:

- **GLTF / GLB** — the modern, web-friendly format. Stands for "GL Transmission Format." Looks like `couch.glb` or `couch.gltf` plus some texture files. **This is the format the app will prefer.**
- **OBJ** — older, very common. Looks like `chair.obj`, often paired with a `chair.mtl` material file and some image files.

Other formats you might see (FBX, STL, 3DS, BLEND) — these are usually convertible to GLTF using a free tool called Blender, but you don't need to worry about that. Stick to GLTF or OBJ downloads when possible.

---

## Where to find free 3D models

Five real sources, in rough order of "best for furniture and home design":

1. **[Sketchfab](https://sketchfab.com/)** — huge community library. Use the "Downloadable" filter and the "Free" filter together. Search for things like "sofa", "armchair", "dining table". Check the license — most free models are CC-BY (you can use them, just credit the artist if you ever publish). Models here vary wildly in quality, so look at the preview before downloading.

2. **[Poly Haven](https://polyhaven.com/models)** — free, CC0 (no credit required), and the quality is consistently high. Smaller library, but excellent for textures, materials, and HDRI environment maps. Less furniture-focused but worth checking.

3. **[Free3D](https://free3d.com/)** — older site, big library. Mixed quality. Lots of "free" downloads, but also some paid-only listings — read carefully. Filter by file type to GLTF or OBJ.

4. **[Polycam Library](https://poly.cam/explore)** — photogrammetry-based, meaning the models are made from real photos of real objects. Often very accurate. Look for the "Free" filter.

5. **[CGTrader Free section](https://www.cgtrader.com/free-3d-models)** — most of CGTrader is paid, but they have a substantial free library. Furniture and interior design are well-represented.

---

## Where to find paid 3D models

When free isn't cutting it (you need a specific brand-name couch, or you want top-tier quality):

- **[TurboSquid](https://www.turbosquid.com/)** — the industry standard for professional 3D models. Anything from $5 to several hundred. Big furniture catalog. Models are usually high-quality and well-documented.

- **[CGTrader](https://www.cgtrader.com/)** — similar to TurboSquid, often a little cheaper. Strong interior design section.

For a personal-use tool like this one, free models will usually be plenty. Paid models make sense if you're trying to match a specific real-world product exactly and need it to look photorealistic.

---

## How to tell if a model is good for this app

Not every 3D model is created equal. Some are beautifully optimized for web rendering; others are huge, slow, and a pain to work with. Here's what to look for:

- **Low to medium polygon count.** A "poly" is the smallest triangle a 3D model is made of. For furniture in a room rendering, aim for **under 50,000 polygons per piece**. Most free model sites display the polygon count somewhere on the listing.
- **Single mesh preferred.** Some models come as one combined shape ("single mesh"); others are split into 20 separate pieces. Single mesh is easier — the app treats the whole thing as one product.
- **Textures included and embedded.** A GLB file with textures baked in is ideal. If textures come as a separate folder of `.jpg` and `.png` files, the app may or may not load them correctly — verify before relying on it.
- **Correct scale / units.** The model should be sized in real-world units (meters or feet). A "chair" that's actually 50 feet tall in the file is a headache. Most listings note the unit; if not, you'll discover it the first time you import.
- **Front of the object faces +Z (or +Y, depending on tool).** This is technical and you can mostly ignore it — but if a model loads in the wrong orientation, the fix is usually to rotate it 90 degrees on placement.

---

## The good-model checklist

Before you click download, run through this:

1. **License is permissive.** CC0, CC-BY, or "free for personal use" — anything restrictive (e.g. "editorial only") isn't worth the headache.
2. **File format is GLTF, GLB, or OBJ.** Anything else, skip.
3. **Polygon count under 50,000.** If the listing doesn't say, eyeball the preview — if it looks "smooth and detailed like a movie character", it's probably too high. If it looks "clean and game-ready", you're good.
4. **Textures look good in the preview.** A model with great geometry but ugly textures will look ugly in the app too.
5. **Real-world size feels plausible.** Listings often note dimensions — check that a chair is "around 2-3 feet wide", not "0.05 units" (no idea what that means).
6. **It has a clean preview.** If the preview shows weird floating geometry, holes in the surface, or pieces sticking out at random angles, the model has problems — skip it.
7. **There are at least a few other downloads / likes / comments.** Vetted by other users = lower risk.

If a model passes all seven, it's a good bet.

---

## What to do if a model is too high-poly

Sometimes you find the perfect model but the polygon count is 500,000 — way too heavy. There are tools that can "decimate" a model (reduce the polygon count while preserving the shape). The most common one is **Blender** (free, open-source). The workflow is: open the model in Blender → apply the Decimate modifier → export back to GLTF.

That said: this is beyond the scope of this app, and beyond what most users should bother with. If a model is too heavy, just find a different one. The web is full of furniture models.

---

## Quick start when 3D upload ships

When the feature lands, the flow will look like this:

1. Find a model online using one of the sources above.
2. Download the `.glb` or `.gltf` file.
3. In Room CAD Renderer: Library → Add Product → Upload 3D Model → drop in the file.
4. Set the real-world dimensions (width / depth / height in feet).
5. Save. The product is now in your library, and any time you place it in a room, you'll see the real 3D shape instead of a plain box.

Until then, the existing product flow (name + photo + dimensions + material) is what you've got. The 3D view shows your products as textured boxes sized to the dimensions you entered, which is enough to feel out spatial fit even without realistic shapes.
