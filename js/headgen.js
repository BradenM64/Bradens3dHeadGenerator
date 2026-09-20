var Head3D = (function () {

    const RENDER_SIZE = 512;
    const PX = 1 / 8;

    const VIEW = {
        head: {size: 2.4}, body: {size: 4.6}
    };

    let currentRender = null;

    function get(id) {
        return document.getElementById(id);
    }

    function loadSkinImage(source) {
        return new Promise(function (resolve, reject) {
            const image = new Image();

            image.onerror = function () {
                reject(new Error("Could not load Minecraft skin."));
            };

            if (source instanceof File) {
                const url = URL.createObjectURL(source);

                image.onload = function () {
                    URL.revokeObjectURL(url);
                    resolve(image);
                };

                image.src = url;
                return;
            }

            image.onload = function () {
                resolve(image);
            };

            image.crossOrigin = "anonymous";
            image.src = "https://minotar.net/skin/" + encodeURIComponent(source);
        });
    }

    function isLegacySkin(skinImage) {
        return skinImage.height < skinImage.width;
    }

    function detectSlimArms(skinImage) {
        if (isLegacySkin(skinImage)) {
            return false;
        }

        const scale = skinImage.width / 64;
        const canvas = document.createElement("canvas");
        canvas.width = skinImage.width;
        canvas.height = skinImage.height;

        const context = canvas.getContext("2d");
        context.drawImage(skinImage, 0, 0);

        const x = Math.round(55 * scale);
        const y = Math.round(20 * scale);
        const alpha = context.getImageData(x, y, 1, 1).data[3];

        return alpha === 0;
    }

    function boxRegions(u, v, w, h, d) {
        return {
            top: {x: u + d, y: v, w: w, h: d},
            bottom: {x: u + d + w, y: v, w: w, h: d, flipY: true},
            right: {x: u, y: v + d, w: d, h: h},
            front: {x: u + d, y: v + d, w: w, h: h},
            left: {x: u + d + w, y: v + d, w: d, h: h},
            back: {x: u + d + w + d, y: v + d, w: w, h: h}
        };
    }

    function mirrorRegions(regions) {
        return {
            top: Object.assign({}, regions.top, {flipX: !regions.top.flipX}),
            bottom: Object.assign({}, regions.bottom, {flipX: !regions.bottom.flipX}),
            front: Object.assign({}, regions.front, {flipX: !regions.front.flipX}),
            back: Object.assign({}, regions.back, {flipX: !regions.back.flipX}),
            left: regions.right,
            right: regions.left
        };
    }

    function createFaceTexture(skinImage, scale, region) {
        const canvas = document.createElement("canvas");
        canvas.width = region.w;
        canvas.height = region.h;

        const context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;
        context.save();
        context.translate(region.w / 2, region.h / 2);

        if (region.rotation) {
            context.rotate(THREE.MathUtils.degToRad(region.rotation));
        }

        context.scale(region.flipX ? -1 : 1, region.flipY ? -1 : 1);

        context.drawImage(skinImage, region.x * scale, region.y * scale, region.w * scale, region.h * scale, -region.w / 2, -region.h / 2, region.w, region.h);

        context.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;

        return texture;
    }

    function createMaterial(skinImage, scale, region) {
        return new THREE.MeshLambertMaterial({
            map: createFaceTexture(skinImage, scale, region), transparent: true, alphaTest: 0.01, side: THREE.FrontSide
        });
    }

    function createPart(skinImage, scale, pxW, pxH, pxD, regions) {
        const geometry = new THREE.BoxGeometry(pxW * PX, pxH * PX, pxD * PX);

        const materials = [createMaterial(skinImage, scale, regions.left), createMaterial(skinImage, scale, regions.right), createMaterial(skinImage, scale, regions.top), createMaterial(skinImage, scale, regions.bottom), createMaterial(skinImage, scale, regions.front), createMaterial(skinImage, scale, regions.back)];

        return new THREE.Mesh(geometry, materials);
    }

    function buildHead(skinImage, scale, withLayers) {
        const group = new THREE.Group();

        const base = createPart(skinImage, scale, 8, 8, 8, boxRegions(0, 0, 8, 8, 8));
        group.add(base);

        if (withLayers) {
            const overlay = createPart(skinImage, scale, 8, 8, 8, boxRegions(32, 0, 8, 8, 8));
            overlay.userData.overlay = true;
            group.add(overlay);
        }

        return group;
    }

    function buildCharacter(skinImage, scale, legacy, withLayers, slim) {
        const group = new THREE.Group();
        const armWidth = slim ? 3 : 4;
        const armOffset = 0.5 + (armWidth * PX) / 2;

        const parts = [{name: "head", w: 8, h: 8, d: 8, x: 0, y: 1.5, uv: [0, 0], overlayUv: [32, 0]}, {
            name: "body", w: 8, h: 12, d: 4, x: 0, y: 0.25, uv: [16, 16], overlayUv: [16, 32]
        }, {name: "armRight", w: armWidth, h: 12, d: 4, x: -armOffset, y: 0.25, uv: [40, 16], overlayUv: [40, 32]}, {
            name: "armLeft",
            w: armWidth,
            h: 12,
            d: 4,
            x: armOffset,
            y: 0.25,
            uv: [32, 48],
            overlayUv: [48, 48],
            mirrorUv: legacy ? [40, 16] : null
        }, {name: "legRight", w: 4, h: 12, d: 4, x: -0.25, y: -1.25, uv: [0, 16], overlayUv: [0, 32]}, {
            name: "legLeft",
            w: 4,
            h: 12,
            d: 4,
            x: 0.25,
            y: -1.25,
            uv: [16, 48],
            overlayUv: [0, 48],
            mirrorUv: legacy ? [0, 16] : null
        }];

        parts.forEach(function (part) {
            const baseRegions = part.mirrorUv ? mirrorRegions(boxRegions(part.mirrorUv[0], part.mirrorUv[1], part.w, part.h, part.d)) : boxRegions(part.uv[0], part.uv[1], part.w, part.h, part.d);

            const baseMesh = createPart(skinImage, scale, part.w, part.h, part.d, baseRegions);
            baseMesh.position.set(part.x, part.y, 0);
            group.add(baseMesh);

            const hasOverlay = withLayers && (part.name === "head" || !legacy);

            if (hasOverlay) {
                const overlayRegions = boxRegions(part.overlayUv[0], part.overlayUv[1], part.w, part.h, part.d);
                const overlayMesh = createPart(skinImage, scale, part.w, part.h, part.d, overlayRegions);
                overlayMesh.position.copy(baseMesh.position);
                overlayMesh.userData.overlay = true;
                group.add(overlayMesh);
            }
        });

        return group;
    }

    function createLighting(settings) {
        const ambient = new THREE.AmbientLight(0xFFFFFF, settings.ambient);
        const hemisphere = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFF, settings.hemisphere);
        const directional = new THREE.DirectionalLight(0xFFFFFF, settings.directional);

        updateLightPosition(directional, settings.lightX, settings.lightY, settings.lightZ);

        return {ambient: ambient, hemisphere: hemisphere, directional: directional};
    }

    function updateLightPosition(directional, x, y, z) {
        const direction = new THREE.Vector3(x, y, z).normalize();
        directional.position.copy(direction.multiplyScalar(10));
        directional.target.position.set(0, 0, 0);
    }

    function applyRotation(subject, settings) {
        subject.rotation.set(THREE.MathUtils.degToRad(settings.pitch), THREE.MathUtils.degToRad(settings.yaw), THREE.MathUtils.degToRad(settings.roll));
    }

    function applyLayerScale(subject, scale) {
        subject.traverse(function (object) {
            if (object.userData.overlay) {
                object.scale.setScalar(scale);
            }
        });
    }

    function disposeSubject(subject) {
        if (!subject) {
            return;
        }

        subject.traverse(function (object) {
            if (!object.isMesh) {
                return;
            }

            object.geometry.dispose();

            object.material.forEach(function (material) {
                if (material.map) {
                    material.map.dispose();
                }
                material.dispose();
            });
        });
    }

    function createRenderer() {
        const renderer = new THREE.WebGLRenderer({
            antialias: true, alpha: true, preserveDrawingBuffer: true
        });

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(1);
        renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);
        renderer.domElement.style.width = RENDER_SIZE + "px";
        renderer.domElement.style.height = RENDER_SIZE + "px";
        renderer.domElement.style.display = "block";

        return renderer;
    }

    function renderScene() {
        if (!currentRender) {
            return;
        }
        currentRender.renderer.render(currentRender.scene, currentRender.camera);
    }

    function rebuildScene() {
        if (!currentRender) {
            return;
        }

        disposeSubject(currentRender.subject);

        const scale = currentRender.skinImage.width / 64;
        const legacy = isLegacySkin(currentRender.skinImage);
        const view = VIEW[currentRender.mode];
        const halfSize = view.size / 2;

        const scene = new THREE.Scene();

        const camera = new THREE.OrthographicCamera(-halfSize, halfSize, halfSize, -halfSize, 0.1, 1000);
        camera.position.set(0, 0, 4);
        camera.lookAt(0, 0, 0);
        camera.zoom = currentRender.settings.zoom;
        camera.updateProjectionMatrix();

        const subject = currentRender.mode === "body" ? buildCharacter(currentRender.skinImage, scale, legacy, currentRender.withLayers, currentRender.slim) : buildHead(currentRender.skinImage, scale, currentRender.withLayers);

        applyRotation(subject, currentRender.settings);
        applyLayerScale(subject, currentRender.settings.layerScale);

        scene.add(subject);

        const lighting = createLighting(currentRender.settings);
        scene.add(lighting.ambient, lighting.hemisphere, lighting.directional, lighting.directional.target);

        currentRender.scene = scene;
        currentRender.camera = camera;
        currentRender.subject = subject;
        currentRender.lighting = lighting;

        renderScene();
    }

    function render(container, source, options) {
        options = options || {};
        const defaults = options.defaults;

        if (!defaults) {
            throw new Error("Head3D.render requires a defaults object.");
        }

        return loadSkinImage(source).then(function (skinImage) {
            const renderer = createRenderer();

            container.innerHTML = "";
            container.appendChild(renderer.domElement);

            const slim = options.slim === undefined ? detectSlimArms(skinImage) : Boolean(options.slim);

            currentRender = {
                renderer: renderer,
                skinImage: skinImage,
                mode: options.mode || "head",
                withLayers: options.withLayers !== false,
                slim: slim,
                settings: {
                    zoom: defaults.camera.zoom,
                    pitch: defaults.head.pitch,
                    yaw: defaults.head.yaw,
                    roll: defaults.head.roll,
                    ambient: defaults.lighting.ambient,
                    hemisphere: defaults.lighting.hemisphere,
                    directional: defaults.lighting.directional,
                    lightX: defaults.lighting.lightX,
                    lightY: defaults.lighting.lightY,
                    lightZ: defaults.lighting.lightZ,
                    layerScale: defaults.layer.scale
                }
            };

            renderer.domElement._head3D = currentRender;

            rebuildScene();

            return {element: renderer.domElement, slim: slim};
        });
    }

    function updateSettings(settings) {
        if (!currentRender) {
            return;
        }

        Object.keys(settings).forEach(function (key) {
            currentRender.settings[key] = parseFloat(settings[key]);
        });

        const s = currentRender.settings;

        currentRender.camera.zoom = s.zoom;
        currentRender.camera.updateProjectionMatrix();

        applyRotation(currentRender.subject, s);
        applyLayerScale(currentRender.subject, s.layerScale);

        currentRender.lighting.ambient.intensity = s.ambient;
        currentRender.lighting.hemisphere.intensity = s.hemisphere;
        currentRender.lighting.directional.intensity = s.directional;
        updateLightPosition(currentRender.lighting.directional, s.lightX, s.lightY, s.lightZ);

        renderScene();
    }

    function setMode(mode) {
        if (!currentRender || currentRender.mode === mode) {
            return;
        }
        currentRender.mode = mode;
        rebuildScene();
    }

    function setLayersEnabled(enabled) {
        if (!currentRender) {
            return;
        }
        currentRender.withLayers = Boolean(enabled);
        rebuildScene();
    }

    function setSlimArms(enabled) {
        if (!currentRender) {
            return;
        }
        currentRender.slim = Boolean(enabled);
        if (currentRender.mode === "body") {
            rebuildScene();
        }
    }

    function sanitizeFilename(name, fallback) {
        const cleaned = String(name || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
        return cleaned || fallback;
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 100);
    }

    function downloadHead(canvas, username) {
        if (!canvas) {
            throw new Error("No head canvas was supplied.");
        }
        var Head3D = (function () {

            const RENDER_SIZE = 512;
            const PX = 1 / 8;

            const VIEW = {
                head: {
                    size: 2.4
                }, body: {
                    size: 4.6
                }
            };

            let currentRender = null;

            function get(id) {
                return document.getElementById(id);
            }

            function loadSkinImage(source) {
                return new Promise(function (resolve, reject) {
                    const image = new Image();

                    image.onerror = function () {
                        reject(new Error("Could not load Minecraft skin."));
                    };

                    if (source instanceof File) {
                        const url = URL.createObjectURL(source);

                        image.onload = function () {
                            URL.revokeObjectURL(url);
                            resolve(image);
                        };

                        image.src = url;
                        return;
                    }

                    image.onload = function () {
                        resolve(image);
                    };

                    image.crossOrigin = "anonymous";
                    image.src = "https://minotar.net/skin/" + encodeURIComponent(source);
                });
            }

            function isLegacySkin(skinImage) {
                return skinImage.height < skinImage.width;
            }

            function detectSlimArms(skinImage) {
                if (isLegacySkin(skinImage)) {
                    return false;
                }

                const scale = skinImage.width / 64;
                const canvas = document.createElement("canvas");
                canvas.width = skinImage.width;
                canvas.height = skinImage.height;

                const context = canvas.getContext("2d");
                context.drawImage(skinImage, 0, 0);

                const x = Math.round(55 * scale);
                const y = Math.round(20 * scale);
                const alpha = context.getImageData(x, y, 1, 1).data[3];

                return alpha === 0;
            }

            function boxRegions(u, v, w, h, d) {
                return {
                    top: {
                        x: u + d, y: v, w: w, h: d
                    }, bottom: {
                        x: u + d + w, y: v, w: w, h: d, flipY: true
                    }, right: {
                        x: u, y: v + d, w: d, h: h
                    }, front: {
                        x: u + d, y: v + d, w: w, h: h
                    }, left: {
                        x: u + d + w, y: v + d, w: d, h: h
                    }, back: {
                        x: u + d + w + d, y: v + d, w: w, h: h
                    }
                };
            }

            function mirrorRegions(regions) {
                return {
                    top: Object.assign({}, regions.top, {
                        flipX: !regions.top.flipX
                    }), bottom: Object.assign({}, regions.bottom, {
                        flipX: !regions.bottom.flipX
                    }), front: Object.assign({}, regions.front, {
                        flipX: !regions.front.flipX
                    }), back: Object.assign({}, regions.back, {
                        flipX: !regions.back.flipX
                    }), left: regions.right, right: regions.left
                };
            }

            function createFaceTexture(skinImage, scale, region) {
                const canvas = document.createElement("canvas");
                canvas.width = region.w;
                canvas.height = region.h;

                const context = canvas.getContext("2d");
                context.imageSmoothingEnabled = false;
                context.save();
                context.translate(region.w / 2, region.h / 2);

                if (region.rotation) {
                    context.rotate(THREE.MathUtils.degToRad(region.rotation));
                }

                context.scale(region.flipX ? -1 : 1, region.flipY ? -1 : 1);

                context.drawImage(skinImage, region.x * scale, region.y * scale, region.w * scale, region.h * scale, -region.w / 2, -region.h / 2, region.w, region.h);

                context.restore();

                const texture = new THREE.CanvasTexture(canvas);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;
                texture.needsUpdate = true;

                return texture;
            }

            function createMaterial(skinImage, scale, region) {
                return new THREE.MeshLambertMaterial({
                    map: createFaceTexture(skinImage, scale, region),
                    transparent: true,
                    alphaTest: 0.01,
                    side: THREE.FrontSide
                });
            }

            function createPart(skinImage, scale, pxW, pxH, pxD, regions) {
                const geometry = new THREE.BoxGeometry(pxW * PX, pxH * PX, pxD * PX);

                const materials = [createMaterial(skinImage, scale, regions.left), createMaterial(skinImage, scale, regions.right), createMaterial(skinImage, scale, regions.top), createMaterial(skinImage, scale, regions.bottom), createMaterial(skinImage, scale, regions.front), createMaterial(skinImage, scale, regions.back)];

                return new THREE.Mesh(geometry, materials);
            }

            function buildHead(skinImage, scale, withLayers) {
                const group = new THREE.Group();

                const base = createPart(skinImage, scale, 8, 8, 8, boxRegions(0, 0, 8, 8, 8));
                group.add(base);

                if (withLayers) {
                    const overlay = createPart(skinImage, scale, 8, 8, 8, boxRegions(32, 0, 8, 8, 8));
                    overlay.userData.overlay = true;
                    group.add(overlay);
                }

                return group;
            }

            function buildCharacter(skinImage, scale, legacy, withLayers, slim) {
                const group = new THREE.Group();
                const armWidth = slim ? 3 : 4;
                const armOffset = 0.5 + (armWidth * PX) / 2;

                const parts = [{
                    name: "head", w: 8, h: 8, d: 8, x: 0, y: 1.5, uv: [0, 0], overlayUv: [32, 0]
                }, {
                    name: "body", w: 8, h: 12, d: 4, x: 0, y: 0.25, uv: [16, 16], overlayUv: [16, 32]
                }, {
                    name: "armRight",
                    w: armWidth,
                    h: 12,
                    d: 4,
                    x: -armOffset,
                    y: 0.25,
                    uv: [40, 16],
                    overlayUv: [40, 32]
                }, {
                    name: "armLeft",
                    w: armWidth,
                    h: 12,
                    d: 4,
                    x: armOffset,
                    y: 0.25,
                    uv: [32, 48],
                    overlayUv: [48, 48],
                    mirrorUv: legacy ? [40, 16] : null
                }, {
                    name: "legRight", w: 4, h: 12, d: 4, x: -0.25, y: -1.25, uv: [0, 16], overlayUv: [0, 32]
                }, {
                    name: "legLeft",
                    w: 4,
                    h: 12,
                    d: 4,
                    x: 0.25,
                    y: -1.25,
                    uv: [16, 48],
                    overlayUv: [0, 48],
                    mirrorUv: legacy ? [0, 16] : null
                }];

                parts.forEach(function (part) {
                    const baseRegions = part.mirrorUv ? mirrorRegions(boxRegions(part.mirrorUv[0], part.mirrorUv[1], part.w, part.h, part.d)) : boxRegions(part.uv[0], part.uv[1], part.w, part.h, part.d);

                    const baseMesh = createPart(skinImage, scale, part.w, part.h, part.d, baseRegions);
                    baseMesh.position.set(part.x, part.y, 0);
                    group.add(baseMesh);

                    const hasOverlay = withLayers && (part.name === "head" || !legacy);

                    if (hasOverlay) {
                        const overlayRegions = boxRegions(part.overlayUv[0], part.overlayUv[1], part.w, part.h, part.d);
                        const overlayMesh = createPart(skinImage, scale, part.w, part.h, part.d, overlayRegions);
                        overlayMesh.position.copy(baseMesh.position);
                        overlayMesh.userData.overlay = true;
                        group.add(overlayMesh);
                    }
                });

                return group;
            }

            function createLighting(settings) {
                const ambient = new THREE.AmbientLight(0xFFFFFF, settings.ambient);
                const hemisphere = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFF, settings.hemisphere);
                const directional = new THREE.DirectionalLight(0xFFFFFF, settings.directional);

                updateLightPosition(directional, settings.lightX, settings.lightY, settings.lightZ);

                return {
                    ambient: ambient, hemisphere: hemisphere, directional: directional
                };
            }

            function updateLightPosition(directional, x, y, z) {
                const direction = new THREE.Vector3(x, y, z).normalize();
                directional.position.copy(direction.multiplyScalar(10));
                directional.target.position.set(0, 0, 0);
            }

            function applyRotation(subject, settings) {
                subject.rotation.set(THREE.MathUtils.degToRad(settings.pitch), THREE.MathUtils.degToRad(settings.yaw), THREE.MathUtils.degToRad(settings.roll));
            }

            function applyLayerScale(subject, scale) {
                subject.traverse(function (object) {
                    if (object.userData.overlay) {
                        object.scale.setScalar(scale);
                    }
                });
            }

            function disposeSubject(subject) {
                if (!subject) {
                    return;
                }

                subject.traverse(function (object) {
                    if (!object.isMesh) {
                        return;
                    }

                    object.geometry.dispose();

                    object.material.forEach(function (material) {
                        if (material.map) {
                            material.map.dispose();
                        }
                        material.dispose();
                    });
                });
            }

            function createRenderer() {
                const renderer = new THREE.WebGLRenderer({
                    antialias: true, alpha: true, preserveDrawingBuffer: true
                });

                renderer.setClearColor(0x000000, 0);
                renderer.setPixelRatio(1);
                renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);
                renderer.domElement.style.width = RENDER_SIZE + "px";
                renderer.domElement.style.height = RENDER_SIZE + "px";
                renderer.domElement.style.display = "block";

                return renderer;
            }

            function renderScene() {
                if (!currentRender) {
                    return;
                }
                currentRender.renderer.render(currentRender.scene, currentRender.camera);
            }

            function rebuildScene() {
                if (!currentRender) {
                    return;
                }

                disposeSubject(currentRender.subject);

                const scale = currentRender.skinImage.width / 64;
                const legacy = isLegacySkin(currentRender.skinImage);
                const view = VIEW[currentRender.mode];
                const halfSize = view.size / 2;

                const scene = new THREE.Scene();

                const camera = new THREE.OrthographicCamera(-halfSize, halfSize, halfSize, -halfSize, 0.1, 1000);
                camera.position.set(0, 0, 4);
                camera.lookAt(0, 0, 0);
                camera.zoom = currentRender.settings.zoom;
                camera.updateProjectionMatrix();

                const subject = currentRender.mode === "body" ? buildCharacter(currentRender.skinImage, scale, legacy, currentRender.withLayers, currentRender.slim) : buildHead(currentRender.skinImage, scale, currentRender.withLayers);

                applyRotation(subject, currentRender.settings);
                applyLayerScale(subject, currentRender.settings.layerScale);

                scene.add(subject);

                const lighting = createLighting(currentRender.settings);
                scene.add(lighting.ambient, lighting.hemisphere, lighting.directional, lighting.directional.target);

                currentRender.scene = scene;
                currentRender.camera = camera;
                currentRender.subject = subject;
                currentRender.lighting = lighting;

                renderScene();
            }

            function render(container, source, options) {
                options = options || {};
                const defaults = options.defaults;

                if (!defaults) {
                    throw new Error("Head3D.render requires a defaults object.");
                }

                return loadSkinImage(source).then(function (skinImage) {
                    const renderer = createRenderer();

                    container.innerHTML = "";
                    container.appendChild(renderer.domElement);

                    const slim = options.slim === undefined ? detectSlimArms(skinImage) : Boolean(options.slim);

                    currentRender = {
                        renderer: renderer,
                        skinImage: skinImage,
                        mode: options.mode || "head",
                        withLayers: options.withLayers !== false,
                        slim: slim,
                        settings: {
                            zoom: defaults.camera.zoom,
                            pitch: defaults.head.pitch,
                            yaw: defaults.head.yaw,
                            roll: defaults.head.roll,
                            ambient: defaults.lighting.ambient,
                            hemisphere: defaults.lighting.hemisphere,
                            directional: defaults.lighting.directional,
                            lightX: defaults.lighting.lightX,
                            lightY: defaults.lighting.lightY,
                            lightZ: defaults.lighting.lightZ,
                            layerScale: defaults.layer.scale
                        }
                    };

                    renderer.domElement._head3D = currentRender;

                    rebuildScene();

                    return {
                        element: renderer.domElement, slim: slim
                    };
                });
            }

            function updateSettings(settings) {
                if (!currentRender) {
                    return;
                }

                Object.keys(settings).forEach(function (key) {
                    currentRender.settings[key] = parseFloat(settings[key]);
                });

                const s = currentRender.settings;

                currentRender.camera.zoom = s.zoom;
                currentRender.camera.updateProjectionMatrix();

                applyRotation(currentRender.subject, s);
                applyLayerScale(currentRender.subject, s.layerScale);

                currentRender.lighting.ambient.intensity = s.ambient;
                currentRender.lighting.hemisphere.intensity = s.hemisphere;
                currentRender.lighting.directional.intensity = s.directional;
                updateLightPosition(currentRender.lighting.directional, s.lightX, s.lightY, s.lightZ);

                renderScene();
            }

            function setMode(mode) {
                if (!currentRender || currentRender.mode === mode) {
                    return;
                }
                currentRender.mode = mode;
                rebuildScene();
            }

            function setLayersEnabled(enabled) {
                if (!currentRender) {
                    return;
                }
                currentRender.withLayers = Boolean(enabled);
                rebuildScene();
            }

            function setSlimArms(enabled) {
                if (!currentRender) {
                    return;
                }
                currentRender.slim = Boolean(enabled);
                if (currentRender.mode === "body") {
                    rebuildScene();
                }
            }

            function sanitizeFilename(name, fallback) {
                const cleaned = String(name || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
                return cleaned || fallback;
            }

            function triggerDownload(blob, filename) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(function () {
                    URL.revokeObjectURL(url);
                }, 100);
            }

            function downloadHead(canvas, username) {
                if (!canvas) {
                    throw new Error("No head canvas was supplied.");
                }

                if (!canvas._head3D) {
                    throw new Error("This canvas was not created by Head3D.");
                }

                const renderData = canvas._head3D;
                renderData.renderer.render(renderData.scene, renderData.camera);

                const filename = sanitizeFilename(username, "minecraft-head") + ".png";

                canvas.toBlob(function (blob) {
                    if (!blob) {
                        console.error("Could not create PNG.");
                        return;
                    }
                    triggerDownload(blob, filename);
                }, "image/png");
            }

            function downloadSkin(username) {
                if (!currentRender) {
                    throw new Error("No skin is currently loaded.");
                }

                const skinImage = currentRender.skinImage;
                const canvas = document.createElement("canvas");
                canvas.width = skinImage.width;
                canvas.height = skinImage.height;

                const context = canvas.getContext("2d");
                context.imageSmoothingEnabled = false;
                context.drawImage(skinImage, 0, 0);

                const filename = sanitizeFilename(username, "minecraft-skin") + "-skin.png";

                canvas.toBlob(function (blob) {
                    if (!blob) {
                        console.error("Could not create PNG.");
                        return;
                    }
                    triggerDownload(blob, filename);
                }, "image/png");
            }

            return {
                render: render,
                updateSettings: updateSettings,
                setMode: setMode,
                setLayersEnabled: setLayersEnabled,
                setSlimArms: setSlimArms,
                downloadHead: downloadHead,
                downloadSkin: downloadSkin,
                getCurrentRender: function () {
                    return currentRender;
                }
            };

        })();
        if (!canvas._head3D) {
            throw new Error("This canvas was not created by Head3D.");
        }

        const renderData = canvas._head3D;
        renderData.renderer.render(renderData.scene, renderData.camera);

        const filename = sanitizeFilename(username, "minecraft-head") + ".png";

        canvas.toBlob(function (blob) {
            if (!blob) {
                console.error("Could not create PNG.");
                return;
            }
            triggerDownload(blob, filename);
        }, "image/png");
    }

    function downloadSkin(username) {
        if (!currentRender) {
            throw new Error("No skin is currently loaded.");
        }

        const skinImage = currentRender.skinImage;
        const canvas = document.createElement("canvas");
        canvas.width = skinImage.width;
        canvas.height = skinImage.height;

        const context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;
        context.drawImage(skinImage, 0, 0);

        const filename = sanitizeFilename(username, "minecraft-skin") + "-skin.png";

        canvas.toBlob(function (blob) {
            if (!blob) {
                console.error("Could not create PNG.");
                return;
            }
            triggerDownload(blob, filename);
        }, "image/png");
    }

    return {
        render: render,
        updateSettings: updateSettings,
        setMode: setMode,
        setLayersEnabled: setLayersEnabled,
        setSlimArms: setSlimArms,
        downloadHead: downloadHead,
        downloadSkin: downloadSkin,
        getCurrentRender: function () {
            return currentRender;
        }
    };

})();