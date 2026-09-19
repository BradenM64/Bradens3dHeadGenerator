// ========================================================
    // Defaults
    // ========================================================

    const DEFAULTS = {

        camera: {
            x: 0,
            y: 0,
            z: 4,

            zoom: 1.7,

        },


        head: {
            pitch: 10,
            yaw: 25,
            roll: 0
        },


        lighting: {
            ambient: 1.00,

            hemisphere: 0,

            directional: 0,

            lightX: -1.0,

            lightY: 0,

            lightZ: 1.0,

            color: 0xFFFFFF,

            skyColor: 0xFFFFFF,

            groundColor: 0xFFFFFF
        },


        layer: {
            enabled: true,

            scale: 1.04
        }
    };


    // ========================================================
    // Slider ranges
    // ========================================================

    const RANGES = {

        ambient: {
            min: 0,
            max: 2
        },

        hemisphere: {
            min: 0,
            max: 2
        },

        directional: {
            min: 0,
            max: 2
        },

        lightX: {
            min: -2,
            max: 2
        },

        lightY: {
            min: -2,
            max: 2
        },

        lightZ: {
            min: -2,
            max: 2
        },

        pitch: {
            min: -180,
            max: 180
        },

        yaw: {
            min: -180,
            max: 180
        },

        roll: {
            min: -180,
            max: 180
        },

        zoom: {
            min: 0.5,
            max: 3
        },

        layerScale: {
            min: 1,
            max: 1.5
        }
    };


    // ========================================================
    // DOM helpers
    // ========================================================

    function get(id) {
        return document.getElementById(id);
    }


    // ========================================================
    // Control setup
    // ========================================================

    function setupControl(
        name,
        value
    ) {
        const numberInput =
            get(name);

        const slider =
            get(name + "-slider");

        const range =
            RANGES[name];


        slider.min =
            range.min;

        slider.max =
            range.max;

        slider.step =
            numberInput.step;

        slider.value =
            value;

        numberInput.value =
            value;
        slider.addEventListener(
            "input",
            function () {
                numberInput.value =
                    slider.value;

                updateSetting(
                    name,
                    slider.value
                );
            }
        );
        numberInput.addEventListener(
            "input",
            function () {
                const value =
                    parseFloat(
                        numberInput.value
                    );

                if (!Number.isFinite(value)) {
                    return;
                }

                slider.value =
                    value;

                updateSetting(
                    name,
                    value
                );
            }
        );
    }


    function initializeControls() {
        setupControl(
            "ambient",
            DEFAULTS.lighting.ambient
        );

        setupControl(
            "hemisphere",
            DEFAULTS.lighting.hemisphere
        );

        setupControl(
            "directional",
            DEFAULTS.lighting.directional
        );

        setupControl(
            "lightX",
            DEFAULTS.lighting.lightX
        );

        setupControl(
            "lightY",
            DEFAULTS.lighting.lightY
        );

        setupControl(
            "lightZ",
            DEFAULTS.lighting.lightZ
        );

        setupControl(
            "pitch",
            DEFAULTS.head.pitch
        );

        setupControl(
            "yaw",
            DEFAULTS.head.yaw
        );

        setupControl(
            "roll",
            DEFAULTS.head.roll
        );

        setupControl(
            "zoom",
            DEFAULTS.camera.zoom
        );

        setupControl(
            "layerScale",
            DEFAULTS.layer.scale
        );
    }
    function setControlValue(
        name,
        value
    ) {
        get(name).value =
            value;

        get(name + "-slider").value =
            value;
    }


    function updateSetting(
        name,
        value
    ) {
        Head3D.updateSettings({
            [name]:
                parseFloat(value)
        });
    }


    // ========================================================
    // Skin loading
    // ========================================================

    function loadSkin() {
        const username =
            get("username")
                .value
                .trim();


        if (!username) {
            return;
        }


        Head3D.render(
            get("preview-container"),

            username,

            {
                withLayers:
                get("include-hat").checked,

                defaults:
                DEFAULTS
            }
        )
            .catch(function (error) {
                console.error(error);
            });
    }


    // ========================================================
    // Reset
    // ========================================================

    function resetControls() {
        get("include-hat").checked =
            DEFAULTS.layer.enabled;

        Head3D.setLayersEnabled(
            DEFAULTS.layer.enabled
        );
        setControlValue(
            "ambient",
            DEFAULTS.lighting.ambient
        );

        setControlValue(
            "hemisphere",
            DEFAULTS.lighting.hemisphere
        );

        setControlValue(
            "directional",
            DEFAULTS.lighting.directional
        );

        setControlValue(
            "lightX",
            DEFAULTS.lighting.lightX
        );

        setControlValue(
            "lightY",
            DEFAULTS.lighting.lightY
        );

        setControlValue(
            "lightZ",
            DEFAULTS.lighting.lightZ
        );

        setControlValue(
            "pitch",
            DEFAULTS.head.pitch
        );

        setControlValue(
            "yaw",
            DEFAULTS.head.yaw
        );

        setControlValue(
            "roll",
            DEFAULTS.head.roll
        );

        setControlValue(
            "zoom",
            DEFAULTS.camera.zoom
        );

        setControlValue(
            "layerScale",
            DEFAULTS.layer.scale
        );


        Head3D.updateSettings({

            ambient:
            DEFAULTS.lighting.ambient,

            hemisphere:
            DEFAULTS.lighting.hemisphere,

            directional:
            DEFAULTS.lighting.directional,

            lightX:
            DEFAULTS.lighting.lightX,

            lightY:
            DEFAULTS.lighting.lightY,

            lightZ:
            DEFAULTS.lighting.lightZ,

            pitch:
            DEFAULTS.head.pitch,

            yaw:
            DEFAULTS.head.yaw,

            roll:
            DEFAULTS.head.roll,

            zoom:
            DEFAULTS.camera.zoom,

            layerScale:
            DEFAULTS.layer.scale
        });
    }


    // ========================================================
    // Event listeners
    // ========================================================

    get("load-button")
        .addEventListener(
            "click",
            loadSkin
        );


    get("username")
        .addEventListener(
            "keydown",
            function (event) {
                if (event.key === "Enter") {
                    loadSkin();
                }
            }
        );


    get("download-button")
        .addEventListener(
            "click",
            function () {
                const render =
                    Head3D.getCurrentRender();


                if (!render) {
                    return;
                }


                Head3D.downloadHead(
                    render.renderer.domElement,

                    get("username")
                        .value
                        .trim()
                );
            }
        );


    get("reset-button")
        .addEventListener(
            "click",
            resetControls
        );


    get("include-hat")
        .addEventListener(
            "change",
            function () {
                Head3D.setLayersEnabled(
                    get("include-hat").checked
                );
            }
        );


    // ========================================================
    // Initialize
    // ========================================================

    initializeControls();
