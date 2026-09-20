const DEFAULTS = {
    camera: {
        zoom: {head: 1.7, body: 1.07}
    }, head: {
        pitch: 10, yaw: 25, roll: 0
    }, lighting: {
        ambient: 1.00, hemisphere: 0, directional: 0, lightX: -1.0, lightY: 0, lightZ: 1.0
    }, layer: {
        enabled: true, scale: 1.04
    }
};

const RANGES = {
    ambient: {min: 0, max: 2},
    hemisphere: {min: 0, max: 2},
    directional: {min: 0, max: 2},
    lightX: {min: -2, max: 2},
    lightY: {min: -2, max: 2},
    lightZ: {min: -2, max: 2},
    pitch: {min: -180, max: 180},
    yaw: {min: -180, max: 180},
    roll: {min: -180, max: 180},
    zoom: {min: 0.5, max: 3},
    layerScale: {min: 1, max: 1.5}
};

let currentMode = "head";

function get(id) {
    return document.getElementById(id);
}

function setupControl(name, value) {
    const numberInput = get(name);
    const slider = get(name + "-slider");
    const range = RANGES[name];

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
    setupControl("ambient", DEFAULTS.lighting.ambient);
    setupControl("hemisphere", DEFAULTS.lighting.hemisphere);
    setupControl("directional", DEFAULTS.lighting.directional);
    setupControl("lightX", DEFAULTS.lighting.lightX);
    setupControl("lightY", DEFAULTS.lighting.lightY);
    setupControl("lightZ", DEFAULTS.lighting.lightZ);
    setupControl("pitch", DEFAULTS.head.pitch);
    setupControl("yaw", DEFAULTS.head.yaw);
    setupControl("roll", DEFAULTS.head.roll);
    setupControl("zoom", DEFAULTS.camera.zoom[currentMode]);
    setupControl("layerScale", DEFAULTS.layer.scale);
}

function setControlValue(name, value) {
    get(name).value = value;
    get(name + "-slider").value = value;
}

function updateSetting(name, value) {
    Head3D.updateSettings({[name]: parseFloat(value)});
}

function buildDefaults() {
    return {
        camera: {zoom: parseFloat(get("zoom").value)}, head: {
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
        }, layer: {scale: parseFloat(get("layerScale").value)}
    };
}

function renderSkin(source) {
    return Head3D.render(get("preview-container"), source, {
        mode: currentMode, withLayers: get("include-hat").checked, defaults: buildDefaults()
    });
}

function loadSkin() {
    const username = get("username").value.trim();
    if (!username) {
        return;
    }

    renderSkin(username)
        .then(function (result) {
            get("slim-arms").checked = result.slim;
        })
        .catch(function (error) {
            console.error(error);
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
        .catch(function (error) {
            console.error(error);
        });
}

function setMode(mode) {
    if (currentMode === mode) {
        return;
    }

    currentMode = mode;
    get("mode-head").classList.toggle("active", mode === "head");
    get("mode-body").classList.toggle("active", mode === "body");

    const zoomDefault = DEFAULTS.camera.zoom[mode];
    setControlValue("zoom", zoomDefault);

    Head3D.setMode(mode);
    Head3D.updateSettings({zoom: zoomDefault});
}

function resetLighting() {
    setControlValue("ambient", DEFAULTS.lighting.ambient);
    setControlValue("hemisphere", DEFAULTS.lighting.hemisphere);
    setControlValue("directional", DEFAULTS.lighting.directional);
    setControlValue("lightX", DEFAULTS.lighting.lightX);
    setControlValue("lightY", DEFAULTS.lighting.lightY);
    setControlValue("lightZ", DEFAULTS.lighting.lightZ);

    Head3D.updateSettings({
        ambient: DEFAULTS.lighting.ambient,
        hemisphere: DEFAULTS.lighting.hemisphere,
        directional: DEFAULTS.lighting.directional,
        lightX: DEFAULTS.lighting.lightX,
        lightY: DEFAULTS.lighting.lightY,
        lightZ: DEFAULTS.lighting.lightZ
    });
}

function resetCamera() {
    const zoomDefault = DEFAULTS.camera.zoom[currentMode];

    setControlValue("pitch", DEFAULTS.head.pitch);
    setControlValue("yaw", DEFAULTS.head.yaw);
    setControlValue("roll", DEFAULTS.head.roll);
    setControlValue("zoom", zoomDefault);
    setControlValue("layerScale", DEFAULTS.layer.scale);

    Head3D.updateSettings({
        pitch: DEFAULTS.head.pitch,
        yaw: DEFAULTS.head.yaw,
        roll: DEFAULTS.head.roll,
        zoom: zoomDefault,
        layerScale: DEFAULTS.layer.scale
    });
}

get("load-button").addEventListener("click", loadSkin);

get("load-file-button").addEventListener("click", function () {
    get("skin-file").click();
});

get("skin-file").addEventListener("change", function () {
    loadSkinFromFile(get("skin-file").files[0]);
});

get("username").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        loadSkin();
    }
});

get("download-render-button").addEventListener("click", function () {
    const render = Head3D.getCurrentRender();
    if (!render) {
        return;
    }
    Head3D.downloadHead(render.renderer.domElement, get("username").value.trim());
});

get("download-skin-button").addEventListener("click", function () {
    const render = Head3D.getCurrentRender();
    if (!render) {
        return;
    }
    Head3D.downloadSkin(get("username").value.trim());
});

get("reset-lighting-button").addEventListener("click", resetLighting);
get("reset-camera-button").addEventListener("click", resetCamera);

get("include-hat").addEventListener("change", function () {
    Head3D.setLayersEnabled(get("include-hat").checked);
});

get("slim-arms").addEventListener("change", function () {
    Head3D.setSlimArms(get("slim-arms").checked);
});

get("mode-head").addEventListener("click", function () {
    setMode("head");
});

get("mode-body").addEventListener("click", function () {
    setMode("body");
});

initializeControls();

console.log(
    '  /\\_/\\  (\n' +
    ' ( ^.^ ) _)\n' +
    '   \\"/  (\n' +
    ' ( | | )\n' +
    '(__d b__)\n' +
    '\n-braden :)'
)