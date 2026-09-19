var Head3D = (function () {

    const RENDER_SIZE = 512;
    const CAMERA_VIEW_SIZE = 2.4;

    let currentRender = null;


    function loadSkinImage(source) {

        return new Promise(function (resolve, reject) {

            const image = new Image();


            image.onload = function () {
                resolve(image);
            };


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


            image.crossOrigin = "anonymous";


            image.src = "https://minotar.net/skin/" + encodeURIComponent(source);
        });
    }


    function createFaceTexture(skinImage, x, y, options) {

        options = options || {};


        const canvas = document.createElement("canvas");


        canvas.width = 8;

        canvas.height = 8;


        const context = canvas.getContext("2d");


        context.imageSmoothingEnabled = false;


        context.clearRect(0, 0, 8, 8);


        context.save();


        context.translate(4, 4);


        if (options.rotation) {

            context.rotate(THREE.MathUtils.degToRad(options.rotation));
        }


        context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);


        context.drawImage(skinImage, x, y, 8, 8, -4, -4, 8, 8);


        context.restore();


        const texture = new THREE.CanvasTexture(canvas);


        texture.magFilter = THREE.NearestFilter;

        texture.minFilter = THREE.NearestFilter;

        texture.generateMipmaps = false;

        texture.needsUpdate = true;


        return texture;
    }


    function createMaterial(skinImage, region) {

        return new THREE.MeshLambertMaterial({

            map: createFaceTexture(skinImage, region.x, region.y, region),

            transparent: true,

            alphaTest: 0.01,

            side: THREE.FrontSide
        });
    }


    function createMaterials(skinImage, regions) {

        return [

            createMaterial(skinImage, regions.left),

            createMaterial(skinImage, regions.right),

            createMaterial(skinImage, regions.top),

            createMaterial(skinImage, regions.bottom),

            createMaterial(skinImage, regions.front),

            createMaterial(skinImage, regions.back)

        ];
    }


    function createHead(skinImage, regions) {

        const geometry = new THREE.BoxGeometry(1, 1, 1);


        const materials = createMaterials(skinImage, regions);


        return new THREE.Mesh(geometry, materials);
    }


    function getBaseRegions() {

        return {

            right: {
                x: 0, y: 8
            },

            left: {
                x: 16, y: 8
            },

            top: {
                x: 8, y: 0
            },

            bottom: {
                x: 16, y: 0, flipY: true
            },

            front: {
                x: 8, y: 8
            },

            back: {
                x: 24, y: 8
            }
        };
    }


    function getOverlayRegions() {

        return {

            right: {
                x: 32, y: 8
            },

            left: {
                x: 48, y: 8
            },

            top: {
                x: 40, y: 0
            },

            bottom: {
                x: 48, y: 0, flipY: true
            },

            front: {
                x: 40, y: 8
            },

            back: {
                x: 56, y: 8
            }
        };
    }


    function createCamera(defaults) {

        const aspect = 1;


        const halfHeight = CAMERA_VIEW_SIZE / 2;


        const halfWidth = halfHeight * aspect;


        const camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 0.1, 1000);


        camera.position.set(defaults.camera.x, defaults.camera.y, defaults.camera.z);


        camera.lookAt(0, 0, 0);


        camera.zoom = defaults.camera.zoom;


        camera.updateProjectionMatrix();


        return camera;
    }


    function createScene(skinImage, withLayers, defaults) {

        const scene = new THREE.Scene();


        const camera = createCamera(defaults);


        const head = createHead(skinImage, getBaseRegions());


        setHeadRotation(head, defaults.head);


        scene.add(head);


        let overlayHead = null;


        if (withLayers) {

            overlayHead = createHead(skinImage, getOverlayRegions());


            setLayerScale(overlayHead, defaults.layer.scale);


            overlayHead.rotation.copy(head.rotation);


            scene.add(overlayHead);
        }


        const directional = new THREE.DirectionalLight(defaults.lighting.color, defaults.lighting.directional);


        scene.add(directional);


        scene.add(directional.target);


        const ambient = new THREE.AmbientLight(defaults.lighting.color, defaults.lighting.ambient);


        scene.add(ambient);


        const hemisphere = new THREE.HemisphereLight(defaults.lighting.skyColor, defaults.lighting.groundColor, defaults.lighting.hemisphere);


        scene.add(hemisphere);


        const light = {

            x: defaults.lighting.lightX,

            y: defaults.lighting.lightY,

            z: defaults.lighting.lightZ
        };


        updateLightPosition(directional, light);


        return {

            scene: scene,

            camera: camera,

            head: head,

            overlayHead: overlayHead,

            directional: directional,

            ambient: ambient,

            hemisphere: hemisphere,

            light: light
        };
    }


    function createRenderer() {

        const renderer = new THREE.WebGLRenderer({

            antialias: true,

            alpha: true,

            preserveDrawingBuffer: true
        });


        renderer.setClearColor(0x000000, 0);


        renderer.setPixelRatio(1);


        renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);


        renderer.domElement.style.width = RENDER_SIZE + "px";


        renderer.domElement.style.height = RENDER_SIZE + "px";


        renderer.domElement.style.display = "block";


        return renderer;
    }


    function setHeadRotation(head, rotation) {

        head.rotation.set(THREE.MathUtils.degToRad(rotation.pitch),

            THREE.MathUtils.degToRad(rotation.yaw),

            THREE.MathUtils.degToRad(rotation.roll));
    }


    function setLayerScale(overlayHead, scale) {

        overlayHead.scale.set(scale, scale, scale);
    }


    function updateLightPosition(directional, light) {

        const direction = new THREE.Vector3(light.x, light.y, light.z).normalize();


        directional.position.copy(direction.multiplyScalar(10));
    }


    function renderScene() {

        if (!currentRender) {
            return;
        }


        currentRender.renderer.render(currentRender.scene, currentRender.camera);
    }


    function render(container, source, options) {

        options = options || {};


        const defaults = options.defaults;


        if (!defaults) {

            throw new Error("Head3D.render requires a defaults object.");
        }


        const withLayers = options.withLayers !== false;


        return loadSkinImage(source)
            .then(function (skinImage) {

                const state = createScene(skinImage, withLayers, defaults);


                const renderer = createRenderer();


                container.innerHTML = "";


                container.appendChild(renderer.domElement);


                currentRender = {

                    renderer: renderer,

                    scene: state.scene,

                    camera: state.camera,

                    head: state.head,

                    overlayHead: state.overlayHead,

                    directional: state.directional,

                    ambient: state.ambient,

                    hemisphere: state.hemisphere,

                    light: state.light,

                    skinImage: skinImage,

                    layerScale: defaults.layer.scale
                };


                renderer.domElement._head3D = currentRender;


                renderScene();


                return renderer.domElement;
            });
    }


    function updateSettings(settings) {

        if (!currentRender) {
            return;
        }


        if (settings.zoom !== undefined) {

            currentRender.camera.zoom = parseFloat(settings.zoom);


            currentRender.camera
                .updateProjectionMatrix();
        }


        if (settings.pitch !== undefined) {

            currentRender.head.rotation.x = THREE.MathUtils.degToRad(parseFloat(settings.pitch));
        }


        if (settings.yaw !== undefined) {

            currentRender.head.rotation.y = THREE.MathUtils.degToRad(parseFloat(settings.yaw));
        }


        if (settings.roll !== undefined) {

            currentRender.head.rotation.z = THREE.MathUtils.degToRad(parseFloat(settings.roll));
        }


        if (currentRender.overlayHead) {

            currentRender.overlayHead
                .rotation
                .copy(currentRender.head.rotation);
        }


        if (settings.ambient !== undefined) {

            currentRender.ambient.intensity = parseFloat(settings.ambient);
        }


        if (settings.hemisphere !== undefined) {

            currentRender.hemisphere.intensity = parseFloat(settings.hemisphere);
        }


        if (settings.directional !== undefined) {

            currentRender.directional.intensity = parseFloat(settings.directional);
        }


        if (settings.lightX !== undefined || settings.lightY !== undefined || settings.lightZ !== undefined) {

            if (settings.lightX !== undefined) {

                currentRender.light.x = parseFloat(settings.lightX);
            }


            if (settings.lightY !== undefined) {

                currentRender.light.y = parseFloat(settings.lightY);
            }


            if (settings.lightZ !== undefined) {

                currentRender.light.z = parseFloat(settings.lightZ);
            }


            updateLightPosition(currentRender.directional, currentRender.light);
        }


        if (settings.layerScale !== undefined) {

            currentRender.layerScale = parseFloat(settings.layerScale);


            if (currentRender.overlayHead) {

                setLayerScale(currentRender.overlayHead, currentRender.layerScale);
            }
        }


        renderScene();
    }


    function disposeObject(object) {

        if (!object) {
            return;
        }


        object.geometry.dispose();


        object.material.forEach(function (material) {

            if (material.map) {
                material.map.dispose();
            }

            material.dispose();
        });
    }


    function setLayersEnabled(enabled) {

        if (!currentRender) {
            return;
        }


        enabled = Boolean(enabled);


        if (enabled === Boolean(currentRender.overlayHead)) {

            return;
        }


        if (enabled) {

            const overlayHead = createHead(currentRender.skinImage, getOverlayRegions());


            setLayerScale(overlayHead, currentRender.layerScale);


            overlayHead.rotation.copy(currentRender.head.rotation);


            currentRender.scene.add(overlayHead);


            currentRender.overlayHead = overlayHead;

        } else {

            currentRender.scene.remove(currentRender.overlayHead);


            disposeObject(currentRender.overlayHead);


            currentRender.overlayHead = null;
        }


        renderScene();
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


        let safeUsername = String(username || "minecraft-head")
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");


        if (!safeUsername) {

            safeUsername = "minecraft-head";
        }


        canvas.toBlob(function (blob) {

            if (!blob) {

                console.error("Could not create PNG.");

                return;
            }


            const url = URL.createObjectURL(blob);


            const link = document.createElement("a");


            link.href = url;


            link.download = safeUsername + ".png";


            document.body.appendChild(link);


            link.click();


            document.body.removeChild(link);


            setTimeout(function () {

                URL.revokeObjectURL(url);

            }, 100);
        }, "image/png");
    }


    function resize() {

        if (!currentRender) {
            return;
        }


        currentRender.renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);


        const halfHeight = CAMERA_VIEW_SIZE / 2;


        const halfWidth = halfHeight;


        currentRender.camera.left = -halfWidth;


        currentRender.camera.right = halfWidth;


        currentRender.camera.top = halfHeight;


        currentRender.camera.bottom = -halfHeight;


        currentRender.camera
            .updateProjectionMatrix();


        renderScene();
    }


    return {

        render: render,

        updateSettings: updateSettings,

        setLayersEnabled: setLayersEnabled,

        downloadHead: downloadHead,

        resize: resize,

        getCurrentRender: function () {
            return currentRender;
        }
    };

})();