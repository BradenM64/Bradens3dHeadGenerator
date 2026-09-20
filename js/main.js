let CONFIG = null;
let currentMode = "head";

function get(id) {
    return document.getElementById(id);
}

function showError(message) {
    let popup = get("error-popup");

    if (!popup) {
        popup = document.createElement("div");
        popup.id = "error-popup";
        popup.className = "error-popup";

        document.body.appendChild(popup);
    }

    popup.textContent = message;
    popup.classList.add("visible");

    clearTimeout(popup._timeout);

    popup._timeout = setTimeout(function () {
        popup.classList.remove("visible");
    }, 4000);
}

function setupControl(name, value) {
    const numberInput = get(name);
    const slider = get(name + "-slider");
    const range = CONFIG.ranges[name];

    slider.min = range.min;
    slider.max = range.max;
    slider.step = numberInput.step;
    slider.value = value;
    numberInput.value = value;

    slider.addEventListener("input", function () {
        numberInput.value = slider.value;

        updateSetting(name, slider.value);
    });

    numberInput.addEventListener("input", function () {
        const value = parseFloat(numberInput.value);

        if (!Number.isFinite(value)) {
            return;
        }

        slider.value = value;

        updateSetting(name, value);
    });
}

function initializeControls() {
    setupControl("ambient", CONFIG.defaults.lighting.ambient);

    setupControl("hemisphere", CONFIG.defaults.lighting.hemisphere);

    setupControl("directional", CONFIG.defaults.lighting.directional);

    setupControl("lightX", CONFIG.defaults.lighting.lightX);

    setupControl("lightY", CONFIG.defaults.lighting.lightY);

    setupControl("lightZ", CONFIG.defaults.lighting.lightZ);

    setupControl("pitch", CONFIG.defaults.head.pitch);

    setupControl("yaw", CONFIG.defaults.head.yaw);

    setupControl("roll", CONFIG.defaults.head.roll);

    setupControl("zoom", CONFIG.defaults.camera.zoom[currentMode]);

    setupControl("layerScale", CONFIG.defaults.layer.scale);

    get("include-hat").checked = CONFIG.defaults.layer.enabled;
}

function setControlValue(name, value) {
    get(name).value = value;
    get(name + "-slider").value = value;
}

function updateSetting(name, value) {
    Head3D.updateSettings({
        [name]: parseFloat(value)
    });
}

function buildDefaults() {
    return {
        camera: {
            zoom: parseFloat(get("zoom").value)
        }, head: {
            pitch: parseFloat(get("pitch").value),
            yaw: parseFloat(get("yaw").value),
            roll: parseFloat(get("roll").value)
        }, lighting: {
            ambient: parseFloat(get("ambient").value),
            hemisphere: parseFloat(get("hemisphere").value),
            directional: parseFloat(get("directional").value),
            lightX: parseFloat(get("lightX").value),
            lightY: parseFloat(get("lightY").value),
            lightZ: parseFloat(get("lightZ").value)
        }, layer: {
            scale: parseFloat(get("layerScale").value)
        }
    };
}

function renderSkin(source) {
    return Head3D.render(get("preview-container"), source, {
        mode: currentMode, withLayers: get("include-hat").checked, defaults: buildDefaults(), apiUrl: CONFIG.apiUrl
    });
}

function loadSkin() {
    const username = get("username")
        .value
        .trim();

    if (!username) {
        showError("Please enter a Minecraft username.");
        return;
    }

    renderSkin(username)
        .then(function (result) {
            get("slim-arms").checked = result.slim;
        })
        .catch(function () {
            showError("Invalid Minecraft username.");
        });
}

function loadSkinFromFile(file) {
    if (!file) {
        return;
    }

    renderSkin(file)
        .then(function (result) {
            get("slim-arms").checked = result.slim;

            get("username").value = file.name.replace(/\.png$/i, "");
        })
        .catch(function () {
            showError("Could not load the selected skin file.");
        });
}

function setMode(mode) {
    if (currentMode === mode) {
        return;
    }

    currentMode = mode;

    get("mode-head")
        .classList
        .toggle("active", mode === "head");

    get("mode-body")
        .classList
        .toggle("active", mode === "body");

    const zoomDefault = CONFIG.defaults.camera.zoom[mode];

    setControlValue("zoom", zoomDefault);

    Head3D.setMode(mode);

    Head3D.updateSettings({
        zoom: zoomDefault
    });
}

function resetLighting() {
    setControlValue("ambient", CONFIG.defaults.lighting.ambient);

    setControlValue("hemisphere", CONFIG.defaults.lighting.hemisphere);

    setControlValue("directional", CONFIG.defaults.lighting.directional);

    setControlValue("lightX", CONFIG.defaults.lighting.lightX);

    setControlValue("lightY", CONFIG.defaults.lighting.lightY);

    setControlValue("lightZ", CONFIG.defaults.lighting.lightZ);

    Head3D.updateSettings({
        ambient: CONFIG.defaults.lighting.ambient,
        hemisphere: CONFIG.defaults.lighting.hemisphere,
        directional: CONFIG.defaults.lighting.directional,
        lightX: CONFIG.defaults.lighting.lightX,
        lightY: CONFIG.defaults.lighting.lightY,
        lightZ: CONFIG.defaults.lighting.lightZ
    });
}

function resetCamera() {
    const zoomDefault = CONFIG.defaults.camera.zoom[currentMode];

    setControlValue("pitch", CONFIG.defaults.head.pitch);

    setControlValue("yaw", CONFIG.defaults.head.yaw);

    setControlValue("roll", CONFIG.defaults.head.roll);

    setControlValue("zoom", zoomDefault);

    setControlValue("layerScale", CONFIG.defaults.layer.scale);

    Head3D.updateSettings({
        pitch: CONFIG.defaults.head.pitch,
        yaw: CONFIG.defaults.head.yaw,
        roll: CONFIG.defaults.head.roll,
        zoom: zoomDefault,
        layerScale: CONFIG.defaults.layer.scale
    });
}

function initializeApplication() {
    get("load-button")
        .addEventListener("click", loadSkin);

    get("load-file-button")
        .addEventListener("click", function () {
            get("skin-file").click();
        });

    get("skin-file")
        .addEventListener("change", function () {
            loadSkinFromFile(get("skin-file").files[0]);
        });

    get("username")
        .addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                loadSkin();
            }
        });

    get("download-render-button")
        .addEventListener("click", function () {
            const render = Head3D.getCurrentRender();

            if (!render) {
                return;
            }

            Head3D.downloadHead(render.renderer.domElement, get("username").value.trim());
        });

    get("download-skin-button")
        .addEventListener("click", function () {
            const render = Head3D.getCurrentRender();

            if (!render) {
                return;
            }

            Head3D.downloadSkin(get("username").value.trim());
        });

    get("reset-lighting-button")
        .addEventListener("click", resetLighting);

    get("reset-camera-button")
        .addEventListener("click", resetCamera);

    get("include-hat")
        .addEventListener("change", function () {
            Head3D.setLayersEnabled(get("include-hat").checked);
        });

    get("slim-arms")
        .addEventListener("change", function () {
            Head3D.setSlimArms(get("slim-arms").checked);
        });

    get("mode-head")
        .addEventListener("click", function () {
            setMode("head");
        });

    get("mode-body")
        .addEventListener("click", function () {
            setMode("body");
        });

    initializeControls();

    console.log(
        '  /\\_/\\  (\n' +
        ' ( ^.^ ) _)\n' +
        '   \\"/  (\n' +
        ' ( | | )\n' +
        '(__d b__)\n' +
        '\n-braden :)');
}

fetch("config.json")
    .then(function (response) {
        if (!response.ok) {
            throw new Error("Could not load config.json.");
        }

        return response.json();
    })
    .then(function (config) {
        CONFIG = config;

        initializeApplication();
    })
    .catch(function (error) {
        console.error(error);
        showError("Could not load configuration.");
    });