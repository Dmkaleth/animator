import { getSetting, setSetting } from "./settings.js";

function openDialog() {
    let mediaRecorder;
    let audioChunks = [];

    async function startRecording(slot) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const pcmData = audioBuffer.getChannelData(0);
                const samples = new Int16Array(pcmData.length);
                for (let i = 0; i < pcmData.length; i++) {
                    samples[i] = pcmData[i] * 32767;
                }

                const mp3encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
                const mp3Data = [];
                const sampleBlockSize = 1152;
                for (let i = 0; i < samples.length; i += sampleBlockSize) {
                    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
                    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                    if (mp3buf.length > 0) {
                        mp3Data.push(new Int8Array(mp3buf));
                    }
                }
                const mp3buf = mp3encoder.flush();
                if (mp3buf.length > 0) {
                    mp3Data.push(new Int8Array(mp3buf));
                }

                const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const fileName = `recording-${slot}-${timestamp}.mp3`;
                const folderPath = 'animator';

                try {
                    await FilePicker.createDirectory('data', folderPath).catch(e => {
                        if (!e.message.includes('EEXIST')) throw e;
                    });

                    
                    const file = new File([mp3Blob], fileName, { type: 'audio/mp3' });
                    const response = await FilePicker.upload('data', folderPath, file, {});
                    if (response.path) {
                        ensuresoundDataIntegrity();
                        soundData[slot] = {
                            file: response.path,
                            delay: parseInt($(`.sound-delay[data-slot="${slot}"]`).val()) || 0,
                            duration: parseInt($(`.sound-duration[data-slot="${slot}"]`).val()) || 1000,
                            fadeIn: parseInt($(`.sound-fadeIn[data-slot="${slot}"]`).val()) || 500,
                            fadeOut: parseInt($(`.sound-fadeOut[data-slot="${slot}"]`).val()) || 500
                        };
                        console.log(`Updated slot ${slot} with file ${response.path}`, soundData[slot]);
                        $(`.sound-file-display[data-slot="${slot}"]`).text(`${folderPath}/${fileName}`);
                        $(`.clear-sounds[data-slot="${slot}"]`).show();
                    }
                    ui.notifications.info(`Recording saved as ${fileName}`);
                } catch (error) {
                    ui.notifications.error(`Error saving recording: ${error.message}`);
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            ui.notifications.info("Recording started...");
        } catch (err) {
            ui.notifications.error("Error starting recording: " + err.message);
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            ui.notifications.info("Recording stopped and saved");
        }
    }

    const nOfSlots = getSetting("nofslots");
    $(document).off("click.DMKalIsAwesome_refreshAnimations").on("click.DMKalIsAwesome_refreshAnimations", "#refreshAnimations", async function() {
        const numAnimations = parseInt($("#numAnimations").val()) || 1;
        
        // Get current nofslots or set to 5 if it doesn't exist
        let currentSlots = getSetting("nofslots");
        
        // Update the macro flag
        await setSetting("nofslots", numAnimations);
        
        ui.notifications.info(`Updated number of animation slots from ${currentSlots} to ${numAnimations}`);
    });
    const easeOptions = [
        "linear",
        "easeInQuad", "easeOutQuad", "easeInOutQuad",
        "easeInCubic", "easeOutCubic", "easeInOutCubic",
        "easeInQuart", "easeOutQuart", "easeInOutQuart",
        "easeInQuint", "easeOutQuint", "easeInOutQuint",
        "easeInSine", "easeOutSine", "easeInOutSine",
        "easeInExpo", "easeOutExpo", "easeInOutExpo",
        "easeInCirc", "easeOutCirc", "easeInOutCirc",
        "easeInElastic", "easeOutElastic", "easeInOutElastic",
        "easeInBack", "easeOutBack", "easeInOutBack",
        "easeInBounce", "easeOutBounce", "easeInOutBounce"
    ];

    // Store the copied text style
    let copiedTextStyle = null;

    // PIXI text style default values
    const defaultTextStyle = {
        fill: "#ff0000",
        fontFamily: "Arial",
        fontSize: 72,
        stroke: "#000000",
        strokeThickness: 5,
        dropShadow: true,
        dropShadowColor: "#000000",
        dropShadowBlur: 4,
        dropShadowAngle: 0.5,
        dropShadowDistance: 5,
        wordWrap: true,
        align: "center",
        wordWrapWidth: 900,
        fadeInDuration: 500,
        fadeOutDuration: 500,
        moveXBy: 0,
        moveYBy: 0,
        movementDuration: 1000,
        movementEase: "linear",
        scaleXTo: 1,
        scaleYTo: 1,
        scaleDuration: 1000,
        scaleEase: "linear",
        rotate: 0
    };

    // Fetch available font choices
    const availableFonts = FontConfig.getAvailableFontChoices();
    const fontOptions = Object.keys(availableFonts)
        .map(font => `<option value="${font}" ${font === defaultTextStyle.fontFamily ? "selected" : ""}>${font}</option>`)
        .join("");

    // File picker wrapped in a promise
    async function filepickerPromise(path) {
        return new Promise((resolve, reject) => {
            const fp = new FilePicker({
                current: path,
                type: "file",
                callback: async (file) => {
                    resolve(file); // Resolve with the selected file
                },
                close: () => console.log("File picker closed")
            });
            fp.render(true);
        });
    }

    // Helper functions
    function getFormValue(html, selector, type = 'string') {
        const element = html.find(selector);
        switch(type) {
            case 'int': return parseInt(element.val()) || 0;
            case 'float': return parseFloat(element.val()) || 0;
            case 'bool': return element.is(':checked');
            case 'trim': return element.val().trim();
            case 'text': return element.text().trim();
            default: return element.val();
        }
    }

    function getTextStyle(html) {
        return {
            fontSize: parseInt(getFormValue(html, '#fontSize', 'int')) || 72,
            fill: getFormValue(html, '#fill'),
            stroke: getFormValue(html, '#stroke'),
            strokeThickness: parseInt(getFormValue(html, '#strokeThickness', 'int')) || 5,
            dropShadow: getFormValue(html, '#dropShadow', 'bool'),
            dropShadowColor: getFormValue(html, '#dropShadowColor'),
            dropShadowBlur: parseInt(getFormValue(html, '#dropShadowBlur', 'int')) || 4,
            dropShadowAngle: parseFloat(getFormValue(html, '#dropShadowAngle', 'float')) || 0.5,
            dropShadowDistance: parseInt(getFormValue(html, '#dropShadowDistance', 'int')) || 5,
            wordWrap: true,
            align: getFormValue(html, '#textAlign'),
            fontFamily: getFormValue(html, '#fontFamily'),
            wordWrapWidth: parseInt(getFormValue(html, '#wordWrapWidth', 'int')) || 900,
            fadeInDuration: parseInt(getFormValue(html, '#fadeInDuration', 'int')) || 500,
            fadeOutDuration: parseInt(getFormValue(html, '#fadeOutDuration', 'int')) || 500,
            moveXBy: parseInt(getFormValue(html, '#moveXBy', 'int')) || 0,
            moveYBy: parseInt(getFormValue(html, '#moveYBy', 'int')) || 0,
            movementDuration: parseInt(getFormValue(html, '#movementDuration', 'int')) || 1000,
            movementEase: getFormValue(html, '#movementEase') || 'linear',
            scaleXTo: parseFloat(getFormValue(html, '#scaleXTo', 'float')) || 1,
            scaleYTo: parseFloat(getFormValue(html, '#scaleYTo', 'float')) || 1,
            scaleDuration: parseInt(getFormValue(html, '#scaleDuration', 'int')) || 1000,
            scaleEase: getFormValue(html, '#scaleEase') || 'linear',
            rotate: parseInt(getFormValue(html, '#rotate', 'int')) || 0
        };
    }

    function getRectStyle(html) {
        return {
            width: 300,
            height: 300,
            anchor: {x: 0, y: 0},
            fillColor: getFormValue(html, '#rectFillColor'),
            fillAlpha: getFormValue(html, '#rectFillAlpha', 'float') || 0,
            lineSize: 0
        };
    }

    function createTemplate(html) {
        const textStyle = getTextStyle(html);
        const imageFiles = [];
        const imagecoordsx = [];
        const imagecoordsy = [];
        const imageScale = [];
        const imageOpacity = [];
        const imageDurations = [];
        const imageDelays = [];
        const imageMoveToX = [];
        const imageMoveToY = [];
        const imageMove = [];
        const imageZIndex = [];
        const imageFadeInDurations = [];
        const imageFadeOutDurations = [];
        const imageMirrorX = [];
        const imageMirrorY = [];
        const imageOnToken = [];
        const imageSizes = [];  
        const imageAttachOptions = [];  // Add array for image attach options
        const texts = [];
        const textStyles = [];
        const textX = [];
        const textY = [];
        const textDurations = [];
        const textDelays = [];
        const textMoveXBy = [];
        const textMoveYBy = [];
        const textScaleX = [];
        const textScaleY = [];
        const textScaleEase = [];
        const textScaleDurations = [];
        const textMovementEase = [];
        const textMovementDurations = [];
        const onToken = [];
        const textPersist = [];  
        const textAttach = [];  
        const textAttachOptions = [];  // Add array for text attach options
        const durationValue = getFormValue(html, '#durationValue', 'float');
        const rectFillColor = getFormValue(html, '#rectFillColor');
        const rectFillAlpha = getFormValue(html, '#rectFillAlpha', 'float');
        const soundFiles = [];
        const soundDelays = [];
        const soundDurations = [];
        const soundFadeIns = [];
        const soundFadeOuts = [];
        const soundTimeStarts = [];
        const soundTimeEnds = [];
        const volumes = [];
    

        // Collect data for each image slot
        for (let i = 0; i < nOfSlots; i++) {
            const file = imgData[i]?.file || null;
            imageFiles.push(file);
            imagecoordsx.push(imgData[i]?.x || 0);
            imagecoordsy.push(imgData[i]?.y || 0);
            imageScale.push(imgData[i]?.scale || 1);
            imageOpacity.push(imgData[i]?.opacity || 1);
            imageDurations.push(imgData[i]?.duration || getFormValue(html, '#durationValue', 'float'));
            imageDelays.push(imgData[i]?.delay || 0);
            imageMoveToX.push(imgData[i]?.moveToX || 0);
            imageMoveToY.push(imgData[i]?.moveToY || 0);
            imageMove.push(imgData[i]?.move || 0);
            imageZIndex.push(imgData[i]?.zIndex || 1);
            imageFadeInDurations.push(imgData[i]?.fadeInDuration || 500);
            imageFadeOutDurations.push(imgData[i]?.fadeOutDuration || 500);
            imageMirrorX.push(imgData[i]?.mirrorX || false);
            imageMirrorY.push(imgData[i]?.mirrorY || false);
            imageOnToken.push(imgData[i]?.onToken || false);
            imageSizes.push({
                width: imgData[i]?.size?.width || null,
                height: imgData[i]?.size?.height || null,
                gridUnits: imgData[i]?.size?.gridUnits || false
            });
            imageAttachOptions.push(imgData[i]?.attachOptions || {
                align: "center",
                edge: "on",
                bindVisibility: true,
                bindAlpha: true,
                followRotation: true,
                randomOffset: false,
                offset: { x: 0, y: 0 }
            });
        }

        // Collect data for each text slot
        for (let i = 0; i < nOfSlots; i++) {
            texts.push(textData[i]?.text || '');
            textStyles.push(textData[i]?.style || {});
            textX.push(textData[i]?.x || 0);
            textY.push(textData[i]?.y || 0);
            textDurations.push(textData[i]?.duration || 3000);
            textDelays.push(textData[i]?.delay || 0);
            textMoveXBy.push(textData[i]?.style?.moveXBy || 0);
            textMoveYBy.push(textData[i]?.style?.moveYBy || 0);
            textMovementDurations.push(textData[i]?.style?.movementDuration || 1000);
            textMovementEase.push(textData[i]?.movementEase || 'linear');
            textScaleX.push(textData[i]?.style?.scaleXTo || 1);
            textScaleY.push(textData[i]?.style?.scaleYTo || 1);
            textScaleEase.push(textData[i]?.style?.scaleEase || 'linear');
            textScaleDurations.push(textData[i]?.style?.scaleDuration || 1000);
            onToken.push(textData[i]?.onToken || false);
            textPersist.push(textData[i]?.persist || false);  
            textAttach.push(textData[i]?.attach || false);  
            textAttachOptions.push(textData[i]?.attachOptions || {
                align: "center",
                edge: "on",
                bindVisibility: true,
                bindAlpha: true,
                followRotation: true,
                randomOffset: false,
                offset: { x: 0, y: 0 }
            });
        }

        // Collect data for each sound slot
        for (let i = 0; i < nOfSlots; i++) {
            soundFiles.push(soundData[i]?.file || '');
            soundDelays.push(soundData[i]?.delay || 0);
            soundDurations.push(soundData[i]?.duration || 0);
            soundFadeIns.push(soundData[i]?.fadeIn || 500);
            soundFadeOuts.push(soundData[i]?.fadeOut || 500);
            soundTimeStarts.push(soundData[i]?.timeStart || 0);
            soundTimeEnds.push(soundData[i]?.timeEnd || 0);
            volumes.push(soundData[i]?.volume || 0.8);
        }

        return {
            textStyle, 
            soundFile: getFormValue(html, '#sound-file', 'text'),
            fadeInAudio: getFormValue(html, '#fadeInAudio', 'int'),
            fadeOutAudio: getFormValue(html, '#fadeOutAudio', 'int'),
            audioDuration: getFormValue(html, '#audioDuration', 'int'),
            imageFiles,
            imagecoordsx,
            imagecoordsy,
            imageScale,
            imageOpacity,
            imageDurations,
            imageDelays,
            imageMoveToX,
            imageMoveToY,
            imageMove,
            imageZIndex,
            imageFadeInDurations,
            imageFadeOutDurations,
            imageMirrorX,
            imageMirrorY,
            imageOnToken,
            imageSizes,  
            imageAttachOptions,  // Add to template
            texts,
            textStyles,
            textX,
            textY,
            textDurations,
            textDelays,
            textMoveXBy,
            textMoveYBy,
            textScaleX,
            textScaleY,
            textScaleEase,
            textScaleDurations,
            textMovementEase,
            textMovementDurations,
            onToken,
            textPersist,  
            textAttach,  
            textAttachOptions,  // Add to template
            durationValue: getFormValue(html, '#durationValue', 'float'),
            rectFillColor: getFormValue(html, '#rectFillColor'),
            rectFillAlpha: getFormValue(html, '#rectFillAlpha', 'float'),
            soundFiles,
            soundDelays,
            soundDurations,
            soundFadeIns,
            soundFadeOuts,
            soundTimeStarts,
            soundTimeEnds,
            volumes,

            imageFilters: imgData.map(img => ({
                colorMatrix: { ...img.filters?.colorMatrix },
                glow: { ...img.filters?.glow },
                blur: { ...img.filters?.blur }
            })),
            imageAnimations: imgData.map(img => ({
                position: Array.isArray(img.animations?.position) ? [...img.animations.position] : [],
                rotation: Array.isArray(img.animations?.rotation) ? [...img.animations.rotation] : [],
                scale: Array.isArray(img.animations?.scale) ? [...img.animations.scale] : [],
                alpha: Array.isArray(img.animations?.alpha) ? [...img.animations.alpha] : [],
                blur: Array.isArray(img.animations?.blur) ? [...img.animations.blur] : []
            })),
            imagePersist: imgData.map(img => img.persist || false),
            imageAttachToSource: imgData.map(img => img.attachToSource || false),
            imageStretchToTarget: imgData.map(img => img.stretchToTarget || false),
            imageBelowToken: imgData.map(img => img.belowToken || false)
        };
    }

    function loadTemplate(html, template) {
        // Load the old text style (for backward compatibility)
        if (template.textStyle) {
            Object.entries(template.textStyle).forEach(([key, value]) => {
                const $elem = html.find(`#${key}`);
                if ($elem.length) {
                    if ($elem.is(':checkbox')) {
                        $elem.prop('checked', value);
                    } else {
                        $elem.val(value);
                    }
                }
            });
        }

        // Load audio settings
        if (template.soundFile) {
            html.find('#sound-file').text(template.soundFile);
        }
        if (template.fadeInAudio) {
            html.find('#fadeInAudio').val(template.fadeInAudio);
        }
        if (template.fadeOutAudio) {
            html.find('#fadeOutAudio').val(template.fadeOutAudio);
        }
        if (template.audioDuration) {
            html.find('#audioDuration').val(template.audioDuration);
        }

        // Load rectangle settings
        if (template.rectFillColor) {
            html.find('#rectFillColor').val(template.rectFillColor);
        }
        if (template.rectFillAlpha) {
            html.find('#rectFillAlpha').val(template.rectFillAlpha);
        }
        if (template.durationValue) {
            html.find('#durationValue').val(template.durationValue);
        }

        // Load image data
        for (let i = 0; i < nOfSlots; i++) {
            const imageFile = template.imageFiles[i];

            if (imageFile) {
                imgData[i] = {
                    file: imageFile,
                    x: template.imagecoordsx[i],
                    y: template.imagecoordsy[i],
                    scale: template.imageScale[i],
                    opacity: template.imageOpacity[i],
                    duration: template.imageDurations[i],
                    delay: template.imageDelays[i],
                    moveToX: template.imageMoveToX[i],
                    moveToY: template.imageMoveToY[i],
                    move: template.imageMove[i],
                    zIndex: template.imageZIndex[i] || 1,
                    fadeInDuration: template.imageFadeInDurations[i],
                    fadeOutDuration: template.imageFadeOutDurations[i],
                    mirrorX: template.imageMirrorX[i] || false,
                    mirrorY: template.imageMirrorY[i] || false,
                    onToken: template.imageOnToken[i] || false,
                    filters: template.imageFilters?.[i] || {
                        colorMatrix: {
                            enabled: false,
                            hue: 0,
                            brightness: 1,
                            contrast: 1,
                            saturate: 0
                        },
                        glow: {
                            enabled: false,
                            distance: 10,
                            outerStrength: 4,
                            innerStrength: 0,
                            color: 0xffffff,
                            quality: 0.1,
                            knockout: false
                        },
                        blur: {
                            enabled: false,
                            strength: 8,
                            blur: 2,
                            blurX: 2,
                            blurY: 2,
                            quality: 4,
                            resolution: 1,
                            kernelSize: 5
                        }
                    },
                    animations: template.imageAnimations?.[i] || {
                        position: template.imageAnimations?.[i]?.position || [],
                        rotation: template.imageAnimations?.[i]?.rotation || [],
                        scale: template.imageAnimations?.[i]?.scale || [],
                        alpha: template.imageAnimations?.[i]?.alpha || [],
                        blur: template.imageAnimations?.[i]?.blur || []
                    },
                    size: template.imageSizes?.[i] || {
                        width: null,
                        height: null,
                        gridUnits: false
                    },
                    persist: template.imagePersist?.[i] || false,
                    attachToSource: template.imageAttachToSource?.[i] || false,
                    stretchToTarget: template.imageStretchToTarget?.[i] || false,
                    belowToken: template.imageBelowToken?.[i] || false,

                    attachOptions: template.imageAttachOptions?.[i] || {
                        align: "center",
                        edge: "on",
                        bindVisibility: true,
                        bindAlpha: true,
                        followRotation: true,
                        randomOffset: false,
                        offset: { x: 0, y: 0 }
                    }
                };
                $(`.image-file[data-slot="${i}"]`).text(imageFile);
                $(`.clear-image[data-slot="${i}"]`).show();
            
                $(`.image-slot[data-slot="${i}"] .image-controls`).show();
                $(`.preview-image[data-slot="${i}"]`).show();
                $(`.configure-fx[data-slot="${i}"]`).show();
                $(`.configure-animation[data-slot="${i}"]`).show();
                $(`.image-x[data-slot="${i}"]`).val(template.imagecoordsx[i]);
                $(`.image-y[data-slot="${i}"]`).val(template.imagecoordsy[i]);
                $(`.image-scale[data-slot="${i}"]`).val(template.imageScale[i]);
                $(`.image-opacity[data-slot="${i}"]`).val(template.imageOpacity[i]);
                $(`.image-duration[data-slot="${i}"]`).val(template.imageDurations[i]);
                $(`.image-delay[data-slot="${i}"]`).val(template.imageDelays[i]);
                $(`.image-moveto-x[data-slot="${i}"]`).val(template.imageMoveToX[i]);
                $(`.image-moveto-y[data-slot="${i}"]`).val(template.imageMoveToY[i]);
                $(`.image-move[data-slot="${i}"]`).val(template.imageMove[i]);
                $(`.image-zindex[data-slot="${i}"]`).val(template.imageZIndex[i] || 1);
                $(`.image-fadeInDuration[data-slot="${i}"]`).val(template.imageFadeInDurations[i]);
                $(`.image-fadeOutDuration[data-slot="${i}"]`).val(template.imageFadeOutDurations[i]);
                $(`.image-mirror-x[data-slot="${i}"]`).prop('checked', template.imageMirrorX[i] || false);
                $(`.image-mirror-y[data-slot="${i}"]`).prop('checked', template.imageMirrorY[i] || false);
                $(`.image-on-token[data-slot="${i}"]`).prop('checked', template.imageOnToken[i] || false);
                $(`.imgontoken[data-slot="${i}"]`).show();
                // Update visibility of controls based on onToken
                const isOnToken = template.imageOnToken[i] || false;
                $(`.image-controls[data-slot="${i}"]`).toggle(!isOnToken);
                $(`.token-image-controls[data-slot="${i}"]`).toggle(isOnToken);
                
                // Update size inputs
                if (template.imageSizes && template.imageSizes[i]) {
                    $(`.image-size-width[data-slot="${i}"]`).val(template.imageSizes[i].width || '');
                    $(`.image-size-height[data-slot="${i}"]`).val(template.imageSizes[i].height || '');
                    $(`.image-size-grid-units[data-slot="${i}"]`).prop('checked', template.imageSizes[i].gridUnits || false);
                }
                
                // Update persist, attachToSource, and stretchToTarget checkboxes
                $(`.image-persist[data-slot="${i}"]`).prop('checked', template.imagePersist?.[i] || false);
                $(`.image-attach-source[data-slot="${i}"]`).prop('checked', template.imageAttachToSource?.[i] || false);
                $(`.image-stretch-target[data-slot="${i}"]`).prop('checked', template.imageStretchToTarget?.[i] || false);
                $(`.image-below-token[data-slot="${i}"]`).prop('checked', template.imageBelowToken?.[i] || false);
                
                // Show/hide token-specific options based on onToken value
                if (template.imageOnToken[i]) {
                    // First remove any existing container
                    $(`.token-image-controls[data-slot="${i}"]`).empty();
                    
                    // Create and append the new container
                    const checkboxContainer = $(`
                        <details style="margin-bottom: 10px;">
                            <summary style="
                                background: gray;
                                color: white;
                                padding: 3px;
                                border-radius: 3px;
                                cursor: pointer;
                                user-select: none;
                            ">
                            Token Image ${i + 1} Controls
                            </summary>
                            <div style="
                                background: lightgray;
                                color: black;
                                padding: 5px;
                                border-radius: 3px;
                                margin-top: 3px;
                            ">
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Scale:</label>
                            <input type="number" class="image-scale" data-slot="${i}" value="1" step="0.1" style="width: 70px;">
                         </div>
                         <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">   
                            <label>Width:</label>
                            <input type="number" class="image-size-width" data-slot="${i}" value="0" style="width: 100%;">
                            <label>Height:</label>
                            <input type="number" class="image-size-height" data-slot="${i}" value="0" style="width: 100%;">
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Opacity:</label>
                            <input type="number" class="image-opacity" data-slot="${i}" value="1" step="0.1" min="0" max="1" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Duration (ms):</label>
                            <input type="number" class="image-duration" data-slot="${i}" value="3000" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Delay (ms):</label>
                            <input type="number" class="image-delay" data-slot="${i}" value="0" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Z-Index:</label>
                            <input type="number" class="image-zindex" data-slot="${i}" value="1" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Fade In (ms):</label>
                            <input type="number" class="image-fadeInDuration" data-slot="${i}" value="500" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Fade Out (ms):</label>
                            <input type="number" class="image-fadeOutDuration" data-slot="${i}" value="500" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Mirror X:</label>
                            <input type="checkbox" class="image-mirror-x" data-slot="${i}">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Mirror Y:</label>
                            <input type="checkbox" class="image-mirror-y" data-slot="${i}">
                        </div></div>
                        <div class="token-options-container" style="
                            background: lightgray;
                            color: black;
                            padding: 5px;
                            border-radius: 3px;
                            margin-top: 3px;
                        ">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" class="image-persist" data-slot="${i}">
                                <label>Persist?</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                                <div style="display: flex; align-items: center;">
                                    <input type="checkbox" class="image-attach-source" data-slot="${i}">
                                    <label>Attach to Source Token?</label>
                                    <button class="attach-options-btnimage" data-slot="${i}" style="margin-left: 5px;" title="Configure attachment options for this image">Attach Options</button>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 5px;">
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" class="image-stretch-target" data-slot="${i}">
                                    <label>Stretch to Target?</label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px; margin-left: 20px;">
                                    <input type="checkbox" class="image-stretch-target-tiling" data-slot="${i}">
                                    <label>Tiling</label>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                                <input type="checkbox" class="image-below-token" data-slot="${i}">
                                <label>Below Token?</label>
                            </div>
                        </div>
                    `);
                    $(`.token-image-controls[data-slot="${i}"]`).append(checkboxContainer);

                    // Set up event handler for attach options button
                    $(`.attach-options-btnimage[data-slot="${i}"]`).off('click').on('click', function() {
                        openAttachOptionsDialog(i, 'image');
                    });

                    // Set checkbox values
                    $(`.image-persist[data-slot="${i}"]`).prop('checked', template.imagePersist?.[i] || false);
                    $(`.image-attach-source[data-slot="${i}"]`).prop('checked', template.imageAttachToSource?.[i] || false);
                    $(`.image-stretch-target[data-slot="${i}"]`).prop('checked', template.imageStretchToTarget?.[i] || false);
                    $(`.image-below-token[data-slot="${i}"]`).prop('checked', template.imageBelowToken?.[i] || false);
                } else {
                    // Remove the container if onToken is false
                    $(`.token-image-controls[data-slot="${i}"]`).empty();
                }
            }
        }

        // Load text data
        for (let i = 0; i < nOfSlots; i++) {
            if (template.texts[i]) {
                textData[i] = {
                    text: template.texts[i],
                    x: template.textX[i],
                    y: template.textY[i],
                    duration: template.textDurations[i],
                    delay: template.textDelays[i],
                    style: template.textStyles[i],
                    moveXBy: template.textMoveXBy[i],
                    moveYBy: template.textMoveYBy[i],
                    movementDuration: template.textMovementDurations[i],
                    movementEase: template.textMovementEase[i],
                    scaleX: template.textScaleX[i],
                    scaleY: template.textScaleY[i],
                    scaleEase: template.textScaleEase[i],
                    scaleDuration: template.textScaleDurations[i],
                    onToken: template.onToken[i] || false,
                    persist: template.textPersist?.[i] || false,  
                    attach: template.textAttach?.[i] || false,  
                    attachOptions: template.textAttachOptions?.[i] || {
                        align: "center",
                        edge: "on",
                        bindVisibility: true,
                        bindAlpha: true,
                        followRotation: true,
                        randomOffset: false,
                        offset: { x: 0, y: 0 }
                    }
                };
                $(`.text-input[data-slot="${i}"]`).val(template.texts[i]);
                $(`.text-x[data-slot="${i}"]`).val(template.textX[i]);
                $(`.text-y[data-slot="${i}"]`).val(template.textY[i]);
                $(`.text-duration[data-slot="${i}"]`).val(template.textDurations[i]);
                $(`.text-delay[data-slot="${i}"]`).val(template.textDelays[i]);
                $(`.text-move-ease[data-slot="${i}"]`).val(template.textMovementEase[i]);
                $(`.text-scale-x[data-slot="${i}"]`).val(template.textScaleX[i]);
                $(`.text-scale-y[data-slot="${i}"]`).val(template.textScaleY[i]);
                $(`.text-scale-ease[data-slot="${i}"]`).val(template.textScaleEase[i]);
                $(`.text-scale-duration[data-slot="${i}"]`).val(template.textScaleDurations[i]);
                $(`.text-persist[data-slot="${i}"]`).prop('checked', template.textPersist?.[i] || false);
                $(`.text-on-token[data-slot="${i}"]`).prop('checked', template.onToken[i] || false);
                $(`.text-attach[data-slot="${i}"]`).prop('checked', template.textAttach?.[i] || false);
                $(`.text-attach[data-slot="${i}"]`).prop('disabled', !template.onToken[i]);
            }
        }

        // Load sound data
        for (let i = 0; i < nOfSlots; i++) {
            if (template.soundFiles[i]) {
                soundData[i] = {
                    file: template.soundFiles[i],
                    delay: template.soundDelays[i],
                    duration: template.soundDurations[i],
                    fadeIn: template.soundFadeIns[i],
                    fadeOut: template.soundFadeOuts[i],
                    timeStart: template.soundTimeStarts[i],
                    timeEnd: template.soundTimeEnds[i],
                    volume: template.volumes[i]
                };
                $(`.sound-file-display[data-slot="${i}"]`).text(template.soundFiles[i]);
                $(`.sound-delay[data-slot="${i}"]`).val(template.soundDelays[i]);
                $(`.sound-duration[data-slot="${i}"]`).val(template.soundDurations[i]);
                $(`.sound-fadeIn[data-slot="${i}"]`).val(template.soundFadeIns[i]);
                $(`.sound-fadeOut[data-slot="${i}"]`).val(template.soundFadeOuts[i]);
                $(`.sound-timeStart[data-slot="${i}"]`).val(template.soundTimeStarts[i]);
                $(`.sound-timeEnd[data-slot="${i}"]`).val(template.soundTimeEnds[i]);
                $(`.sound-volume[data-slot="${i}"]`).val(template.volumes[i]);
            }
        }
    }

    function generateAnimationCode(template, rectStyle) {
        const source = 'canvas.tokens.controlled[0]';
        const target = game.user.targets.first();
        const templateName = template.name;
        let animationCode = `
    new Sequence()
        .effect()
        .name("${templateName}")
            .shape("rectangle", ${JSON.stringify(rectStyle)})
            .screenSpace()
            .screenSpaceAboveUI()
            .screenSpaceAnchor(0.0)
            .screenSpaceScale({fitX: true, fitY: true})  
            .screenSpacePosition({ x: 0, y: 0 })
            .duration(${template.durationValue})
            .fadeIn(500)
            .fadeOut(500)
        `;

        // Add each image to the sequence
        for (let i = 0; i < nOfSlots; i++) {
            const imageFile = template.imageFiles[i];

            if (imageFile) {
                let code = `
                .effect()
                .name("${templateName}")
                    .file("${imageFile}")`;

                if (template.imageOnToken[i]) {
                    code += `
                    .atLocation(${source}, { cacheLocation: true })
                    .scale(${template.imageScale[i]})
                    .opacity(${template.imageOpacity[i]})
                    .duration(${template.imageDurations[i]})
                    .delay(${template.imageDelays[i]})
                    .fadeIn(${template.imageFadeInDurations[i]})
                    .fadeOut(${template.imageFadeOutDurations[i]})
                    .zIndex(${template.imageZIndex[i]})
                    .mirrorX(${template.imageMirrorX[i]})
                    .mirrorY(${template.imageMirrorY[i]})`;
                } else {
                    code += `
                    .atLocation({ x: 0, y: 0 })
                    .screenSpaceAboveUI()
                    .screenSpaceAnchor(0.5)
                    .screenSpacePosition({ x: ${template.imagecoordsx[i]}, y: ${template.imagecoordsy[i]} })
                    .scale(${template.imageScale[i]})
                    .opacity(${template.imageOpacity[i]})
                    .duration(${template.imageDurations[i]})
                    .delay(${template.imageDelays[i]})
                    .fadeIn(${template.imageFadeInDurations[i]})
                    .fadeOut(${template.imageFadeOutDurations[i]})
                    .zIndex(${template.imageZIndex[i]})
                    .mirrorX(${template.imageMirrorX[i]})
                    .mirrorY(${template.imageMirrorY[i]})`;
                }

                // Add size if specified
                if (template.imageSizes[i] && (template.imageSizes[i].width !== null || template.imageSizes[i].height !== null)) {
                    code += `
                    .size({ ${template.imageSizes[i].width !== null ? `width: ${template.imageSizes[i].width}, ` : ''}${template.imageSizes[i].height !== null ? `height: ${template.imageSizes[i].height}` : ''} }, { gridUnits: ${template.imageSizes[i].gridUnits} })`;
                }

                // Position animation
                if (template.imageAnimations[i].position?.length > 0) {
                    // Store true initial position if not already stored
                    const initialX = template.imagecoordsx[i];
                    const initialY = template.imagecoordsy[i];
                    let fromX = initialX;
                    let fromY = initialY;
                
                    for (const posAnim of template.imageAnimations[i].position) {
                        if (!posAnim || posAnim.enabled === false) continue;
                        const toX = fromX + posAnim.moveToX;
                        const toY = fromY + posAnim.moveToY;
                        code += `
                        .animateProperty("spriteContainer", "position.x", {
                            from: ${fromX},
                            to: ${toX},
                            duration: ${posAnim.duration},
                            ease: "${posAnim.ease}",
                            delay: ${posAnim.delay},
                            gridUnits: ${posAnim.gridUnits},
                            fromEnd: ${posAnim.fromEndX},
                            relative: false,
                            absolute: true
                        })
                        .animateProperty("spriteContainer", "position.y", {
                            from: ${fromY},
                            to: ${toY},
                            duration: ${posAnim.duration},
                            ease: "${posAnim.ease}",
                            delay: ${posAnim.delay},
                            gridUnits: ${posAnim.gridUnits},
                            fromEnd: ${posAnim.fromEndY},
                            relative: false,
                            absolute: true
                        })`;
                
                        // Update positions for next animation
                        fromX = toX;
                        fromY = toY;
                        template.imagecoordsx[i] = toX;
                        template.imagecoordsy[i] = toY;
                    }
                }

                // Rotation animation
                if (template.imageAnimations[i].rotation?.length > 0) {
                    for (const rotAnim of template.imageAnimations[i].rotation) {
                        if (!rotAnim || rotAnim.enabled === false) continue;
                        const animProps = {
                            from: rotAnim.from,
                            to: rotAnim.to,
                            duration: rotAnim.duration,
                            ease: rotAnim.ease,
                            delay: rotAnim.delay,
                            fromEnd: rotAnim.fromEnd
                        };
                        
                        if (rotAnim.loop) {
                            code += `.loopProperty("sprite", "rotation", ${JSON.stringify(animProps)})`;
                        } else {
                            code += `.animateProperty("sprite", "rotation", ${JSON.stringify(animProps)})`;
                        }
                    }
                }

                // Scale animation
                if (template.imageAnimations[i].scale?.length > 0) {
                    for (const scaleAnim of template.imageAnimations[i].scale) {
                        if (!scaleAnim || scaleAnim.enabled === false) continue;
                        code += `
                        .animateProperty("sprite", "scale.x", {
                            from: ${scaleAnim.fromX},
                            to: ${scaleAnim.toX},
                            duration: ${scaleAnim.duration},
                            ease: "${scaleAnim.ease}",
                            delay: ${scaleAnim.delay},
                            fromEnd: ${scaleAnim.fromEnd}
                        })
                        .animateProperty("sprite", "scale.y", {
                            from: ${scaleAnim.fromY},
                            to: ${scaleAnim.toY},
                            duration: ${scaleAnim.duration},
                            ease: "${scaleAnim.ease}",
                            delay: ${scaleAnim.delay},
                            fromEnd: ${scaleAnim.fromEnd}
                        })`;
                    }
                }

                // Alpha animation
                if (template.imageAnimations[i].alpha?.length > 0) {
                    for (const alphaAnim of template.imageAnimations[i].alpha) {
                        if (!alphaAnim || alphaAnim.enabled === false) continue;
                        code += `
                        .animateProperty("sprite", "alpha", {
                            from: ${alphaAnim.from},
                            to: ${alphaAnim.to},
                            duration: ${alphaAnim.duration},
                            ease: "${alphaAnim.ease}",
                            delay: ${alphaAnim.delay},
                            fromEnd: ${alphaAnim.fromEnd}
                        })`;
                    }
                }
                // Blur animation
                if (template.imageAnimations[i].blur?.length > 0) {
                    code += `.filter("Blur", { strength: 0.1, blurX: 0.1, blurY: 0.1, quality: 1 }, "blurEffect")`;
                    for (const blurAnim of template.imageAnimations[i].blur) {
                        if (!blurAnim || blurAnim.enabled === false) continue;
                        code += `
                        .animateProperty("effectFilters.blurEffect", "strength", {
                            from: ${blurAnim.fromStrength},
                            to: ${blurAnim.toStrength},
                            duration: ${blurAnim.duration},
                            ease: "${blurAnim.ease}",
                            delay: ${blurAnim.delay}
                        })
                        .animateProperty("effectFilters.blurEffect", "blurX", {
                            from: ${blurAnim.fromBlurX},
                            to: ${blurAnim.toBlurX},
                            duration: ${blurAnim.duration},
                            ease: "${blurAnim.ease}",
                            delay: ${blurAnim.delay}
                        })
                        .animateProperty("effectFilters.blurEffect", "blurY", {
                            from: ${blurAnim.fromBlurY},
                            to: ${blurAnim.toBlurY},
                            duration: ${blurAnim.duration},
                            ease: "${blurAnim.ease}",
                            delay: ${blurAnim.delay}
                        })`;
                    }
                }

                // Apply filters if enabled
                if (template.imageFilters?.[i]?.colorMatrix.enabled) {
                    code += `
                    .filter("ColorMatrix", {
                        hue: ${template.imageFilters[i].colorMatrix.hue},
                        brightness: ${template.imageFilters[i].colorMatrix.brightness},
                        contrast: ${template.imageFilters[i].colorMatrix.contrast},
                        saturate: ${template.imageFilters[i].colorMatrix.saturate}
                    }, "colorMatrix")`;
                }
                
                if (template.imageFilters?.[i]?.glow.enabled) {
                    code += `
                    .filter("Glow", {
                        distance: ${template.imageFilters[i].glow.distance},
                        outerStrength: ${template.imageFilters[i].glow.outerStrength},
                        innerStrength: ${template.imageFilters[i].glow.innerStrength},
                        color: ${template.imageFilters[i].glow.color},
                        quality: ${template.imageFilters[i].glow.quality},
                        knockout: ${template.imageFilters[i].glow.knockout}
                    }, "glowEffect")`;
                }
                
                if (template.imageFilters?.[i]?.blur.enabled) {
                    code += `
                    .filter("Blur", {
                        strength: ${template.imageFilters[i].blur.strength},
                        blur: ${template.imageFilters[i].blur.blur},
                        blurX: ${template.imageFilters[i].blur.blurX},
                        blurY: ${template.imageFilters[i].blur.blurY},
                        quality: ${template.imageFilters[i].blur.quality},
                        resolution: ${template.imageFilters[i].blur.resolution},
                        kernelSize: ${template.imageFilters[i].blur.kernelSize}
                    }, "blurEffect")`;
                }
                if (template.imageOnToken[i]) {
                    if (template.imageAttachToSource[i]) {
                        code += `\n                .attachTo(${source}, ${JSON.stringify(template.imageAttachOptions[i])})`;
                    }

                    if (template.imageStretchToTarget[i] && target) {
                        code += `\n                .stretchTo(game.user.targets.first(), { attachTo: true, tiling: ${template.imageStretchToTarget[i].tiling} })`;
                    }

                    if (template.imageBelowToken[i]) {
                        code += `\n                .belowTokens()`;
                    }

                    if (template.imagePersist[i]) {
                        code += `\n                .persist()`;
                    }
                }
                animationCode += code;
            }
        }

        // Add text with properly stringified style
        for (let i = 0; i < nOfSlots; i++) {
            const text = template.texts[i];
            if (text) {
                // Create a copy of the style with numeric values properly parsed
                const style = { ...template.textStyles[i] };
                style.fontSize = parseInt(style.fontSize) || 72;
                style.strokeThickness = parseInt(style.strokeThickness) || 5;
                style.dropShadowBlur = parseInt(style.dropShadowBlur) || 4;
                style.dropShadowAngle = parseFloat(style.dropShadowAngle) || 0.5;
                style.dropShadowDistance = parseInt(style.dropShadowDistance) || 5;
                style.wordWrapWidth = parseInt(style.wordWrapWidth) || 900;

                const fadeInDuration = parseInt(style.fadeInDuration) || 500;
                const fadeOutDuration = parseInt(style.fadeOutDuration) || 500;
                const moveXBy = parseInt(style.moveXBy) || 0;
                const moveYBy = parseInt(style.moveYBy) || 0;
                const movementDuration = parseInt(style.movementDuration) || 1000;
                const scaleXTo = parseFloat(style.scaleXTo) || 1;
                const scaleYTo = parseFloat(style.scaleYTo) || 1;
                const scaleDuration = parseInt(style.scaleDuration) || 1000;
                const scaleEase = template.textScaleEase[i] || "linear";
                const movementEase = template.textMovementEase[i] || "linear";

                animationCode += `
        .effect()
        .name("${templateName}")
            .text("${text}", ${JSON.stringify(style)})
            .rotate(${style.rotate || 0})`;

                if (template.onToken[i]) {
                    if (template.textAttach[i]) {
                        animationCode += `
            .attachTo(${source}, ${JSON.stringify(template.textAttachOptions[i])})`;
                    } else {
                        animationCode += `
            .atLocation(${source}, { cacheLocation: true })`;
                    }
                    if (template.textPersist[i]) {
                        animationCode += `
            .persist()`;
                    }
                } else {
                    animationCode += `
            .atLocation({ x: 0, y: 0 })
            .screenSpaceAboveUI()
            .screenSpaceAnchor(0.5)
            .screenSpacePosition({ x: ${template.textX[i]}, y: ${template.textY[i]} })`;
                }

                animationCode += `
            .duration(${template.textDurations[i]})
            .delay(${template.textDelays[i]})
            .fadeIn(${fadeInDuration})
            .fadeOut(${fadeOutDuration})
            .zIndex(50)
            .animateProperty("sprite", "position.x", {
                from: ${template.textX[i]},
                to: ${template.textX[i] + moveXBy},
                duration: ${movementDuration},
                ease: "${movementEase}",
                delay: 0,
                relative: false
            })
            .animateProperty("sprite", "position.y", {
                from: ${template.textY[i]},
                to: ${template.textY[i] + moveYBy},
                duration: ${movementDuration},
                ease: "${movementEase}",
                delay: 0,
                relative: false
            })
            .animateProperty("sprite", "scale.x", {
                from: 1,
                to: ${scaleXTo},
                duration: ${scaleDuration},
                ease: "${scaleEase}",
                delay: 0
            })
            .animateProperty("sprite", "scale.y", {
                from: 1,
                to: ${scaleYTo},
                duration: ${scaleDuration},
                ease: "${scaleEase}",
                delay: 0
            })`;
            }
        }

        // Add sound effects
        for (let i = 0; i < nOfSlots; i++) {
            const soundFile = template.soundFiles[i];
            if (soundFile) {
                const duration = template.soundDurations[i];
                const timeStart = template.soundTimeStarts[i];
                const timeEnd = template.soundTimeEnds[i];
                animationCode += `
        .sound()
            .file("${soundFile}")
            .name("${templateName}")
            .delay(${template.soundDelays[i]})` +
            (duration !== 0 ? `
            .duration(${duration})` : '') +
            (timeStart !== 0 ? `
            .startTime(${timeStart})` : '') +
            (timeEnd !== 0 ? `
            .endTime(${timeEnd})` : '') + `
            .fadeInAudio(${template.soundFadeIns[i]})
            .fadeOutAudio(${template.soundFadeOuts[i]})
            .volume(${template.volumes[i]})
        `;
            }
        }

        if (template.soundFile && template.soundFile !== "None") {
            animationCode += `
        .sound()
            .file("${template.soundFile}")
            .name("${templateName}")
            .fadeInAudio(${template.fadeInAudio})
            .fadeOutAudio(${template.fadeOutAudio})
            .duration(${template.audioDuration})
        `;
        }

        animationCode += `
        .play({ preload: true });
        `;

        return animationCode;
    }

    // Generate form fields for PIXI text styles, audio, and image options
    function generateTextStyleForm(style) {
        return `
        <style>
        .image-slot, .sound-slot {
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        padding: 10px;
        background-color: #e8e8e8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        }
        .image-slot:hover, .sound-slot:hover {
        border-color: #b0b0b0;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }
                    details {
                border: 1px solid rgba(74, 144, 226, 0.15);
                border-radius: 5px;
                padding: 10px;
                margin: 10px 0;
                background: #ccc;
            }
            details summary {
                cursor: pointer;
                padding: 5px;
                color: #333;
                font-weight: bold;
            }
            details[open] summary {
                margin-bottom: 10px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
    </style>


    <div style="display: grid; grid-template-columns: 0.9fr 1.2fr 1.4fr 1fr; gap: 0px;">
    <div class="settings-column" style="grid-column: 1;">
        <!-- First Fieldset -->
        <fieldset style="
        border-radius: 8px;
        padding: 15px;
        background: #f9f9f9;
        color: #333;
        font-size: 14px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin: 5px;
        ">
        <legend style="
            padding: 5px 10px;
            border: 1px solid #1f497d;
            background: #e4f0fb;
            color: #1f497d;
            border-radius: 8px;
            font-size: 14px;
        ">New Template Name</legend>      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <label for="templateNameNew" style="flex: 1; text-align: left; margin-right: 28px;">New template name:</label><br>
        <br><input id="template-text" type="text" style="width: 100%; flex: 2; margin-right: 28px;" placeholder="Enter your new template name here">
    </div>
        </fieldset>
        <!-- First Fieldset -->
    

        <!-- Second Fieldset -->
        <fieldset style="
        border-radius: 8px;
        padding: 10px;
        background: #f9f9f9;
        color: #333;
        font-size: 14px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin: 5px;
        ">
        <legend style="
            padding: 5px 10px;
            border: 1px solid #1f497d;
            background: #e4f0fb;
            color: #1f497d;
            border-radius: 8px;
            font-size: 14px;
        ">Load Template</legend>
        <div style="display: flex; align-items: center; width: 100%;">
            <select id="template-select" style="flex-grow: 1; margin-right: 5px;">
            <option value="" selected disabled>-- Select a Previous Splash --</option>
            </select>
            <button id="delete-template" title="Delete selected template" style="padding: 3px 8px; background: #4a6484; color: white; border: none; border-radius: 3px; cursor: pointer; margin-bottom: 10px;">
            <i class="fas fa-trash"></i>
            </button>
        </div><br>

        </fieldset>
    <fieldset style="
        border-radius: 8px;
        padding: 15px;
        background: #f9f9f9;
        color: #333;
        font-size: 14px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin: 5px;
        ">
        <legend style="
            padding: 5px 10px;
            border: 1px solid #1f497d;
            background: #e4f0fb;
            color: #1f497d;
            border-radius: 8px;
            font-size: 14px;
        ">Background and Duration</legend>
        <p>Background Color:</p>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="rectFillColor" style="flex: 1; text-align: left;">Fill Color:</label>
            <input type="color" id="rectFillColor" value="#000001" style="flex: 2; margin-left: 8px;">
            <label for="rectFillAlpha" style="flex: 2; text-align: left; margin-left: 8px;">Fill Alpha:</label>
            <input type="number" id="rectFillAlpha" value="0.5" step="0.01" min="0" max="1" style="flex: 3; margin-left: 8px;">
        </div>
        <hr>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <label for="durationLabel" style="flex: 1; text-align: left;">Animation Duration (ms):</label>
            <input type="number" id="durationValue" value="3000" style="flex: 2;">
        </div>
        </fieldset>
        <!-- Third Fieldset -->
        <fieldset style="
        border-radius: 8px;
        padding: 15px;
        background: #f9f9f9;
        color: #333;
        font-size: 14px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin: 5px;
        ">
        <legend style="
            padding: 5px 10px;
            border: 1px solid #1f497d;
            background: #e4f0fb;
            color: #1f497d;
            border-radius: 8px;
            font-size: 14px;
        ">Preview Splash Screen</legend>
        <button id="show" title="Preview the whole animation screen" style="
                                    padding: 3px 8px;
                                    background: #4a6484;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    margin-bottom: 10px;
                                ">Preview</button>
        <button id="timeline-button" title="Open timeline editor for the whole scene" style="
                                    padding: 3px 8px;
                                    background: #4a6484;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                ">Timeline</button>
        </fieldset>

        <!-- Fourth Fieldset -->
        <fieldset style="
        border-radius: 8px;
        padding: 15px;
        background: #f9f9f9;
        color: #333;
        font-size: 14px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin: 5px;
        ">
        <legend style="
            padding: 5px 10px;
            border: 1px solid #1f497d;
            background: #e4f0fb;
            color: #1f497d;
            border-radius: 8px;
            font-size: 14px;
        ">Save as Macro</legend>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <label for="saveMacro" style="flex: 1; text-align: left;">Save as Macro:</label>
            <input type="checkbox" id="saveMacro" style="margin-left: 5px; flex: 2;">
        </div>
        </fieldset>
        
    </div>
    <div style="grid-column: 2;">

        <fieldset style="
            border-radius: 8px;
            grid-column: 1;
            grid-row: 1;
            padding: 10px;
            background: #f9f9f9;
            color: #333;
            font-size: 14px;
            border: 1px solid #ccc;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin: 5px;
        ">
            <legend style="
                padding: 5px 10px;
                border: 1px solid #1f497d;
                background: #e4f0fb;
                color: #1f497d;
                border-radius: 8px;
                font-size: 14px;
            ">
                Animation Control
            </legend>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <label for="numAnimations" style="margin-right: 10px;">Number of animations:</label>
                <input type="number" id="numAnimations" min="1" value="${nOfSlots}" style="width: 60px; margin-right: 10px;">
                <button id="refreshAnimations" title="Change the number of animations, you need to close and reopen Animator" style="
                    padding: 5px 10px;
                    background: #4a6484;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                ">Refresh</button>
            </div>
        </fieldset>
        <fieldset style="
            border-radius: 8px;
            grid-column: 1;
            grid-row: 2;
            padding: 10px;
            background: #f9f9f9;
            color: #333;
            font-size: 14px;
            border: 1px solid #ccc;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin: 5px;
        ">
            <legend style="
                padding: 5px 10px;
                border: 1px solid #1f497d;
                background: #e4f0fb;
                color: #1f497d;
                border-radius: 8px;
                font-size: 14px;
            ">
                Text Animations
            </legend>

            <div>
                ${Array(nOfSlots).fill().map((_, i) => `
                    <details style="margin-bottom: 10px;">
                        <summary style="
                            background: gray;
                            padding: 5px;
                            margin: 5px 0;
                            cursor: pointer;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            color: white;
                            border-radius: 4px;
                        ">
                            <span>Text ${i + 1}</span>
                        </summary>
                        <div class="text-content" style="padding: 10px; border: 1px solid #666; margin-bottom: 10px;">
                            <div style="margin-bottom: 10px;">
                                <textarea class="text-input" data-slot="${i}" style="width: 100%; margin-bottom: 5px; resize: vertical;" placeholder="Enter text..." onkeydown="if(event.key === 'Enter') event.preventDefault();"></textarea>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;">
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <label>On Token?</label><input type="checkbox" class="text-on-token" data-slot="${i}" style="margin-right: 10px;">
                                    <label>Attach?</label>
                                    <input type="checkbox" class="text-attach" data-slot="${i}" style="margin-left: 20px; margin-right: 10px;" disabled>
                                    
                                    
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" class="text-persist" data-slot="${i}" style="margin-right: 10px;">
                                    <label>Persist?</label>
                                </div>
                            </div>
                            <div class="text-controls" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                <div class="position-controls">
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <label>X:</label>
                                        <input type="number" class="text-x" data-slot="${i}" value="0" style="width: 60px;">
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <label>Y:</label>
                                        <input type="number" class="text-y" data-slot="${i}" value="0" style="width: 60px;">
                                    </div>
                                </div>
                                <div class="timing-controls">
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <label>Duration:</label>
                                        <input type="number" class="text-duration" data-slot="${i}" value="3000" style="width: 60px;">
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <label>Delay:</label>
                                        <input type="number" class="text-delay" data-slot="${i}" value="0" style="width: 60px;">
                                    </div>
                                    <button class="text-target" data-slot="${i}" title="Screen target" style="display: block;width:30px;height:30px;padding: 3px 8px!important;
                                        background: #4a6484!important;
                                        color: white!important;
                                        border: none!important;
                                        border-radius: 3px!important;
                                        cursor: pointer!important;">
                                        <i class="fas fa-crosshairs"></i>
                                    </button>

                                </div>
                                <div class="style-controls" style="grid-column: span 2;">
                                    <div style="display: flex; gap: 0px;">
                                        <button class="configure-style" data-slot="${i}" title="Configure text style and animations" style="flex: 1;height: 30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;">Style</button>
                                        <button class="copy-style" data-slot="${i}" title="Copy current style" style="flex: 1;height: 30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;">Copy</button>
                                        <button class="paste-style" data-slot="${i}" title="Paste copied style" style="flex: 1;height: 30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;">Paste</button>
                                        <button class="preview-text" data-slot="${i}" title="Preview text" style="flex: 1;height: 30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;">Preview</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </details>
                `).join('')}
            </div>
        </fieldset>
    </div>

            
            <div class="text-column" style="grid-column: 3;">
            <fieldset style="
            border-radius: 8px;
            padding: 15px;
            background: #f9f9f9;
            color: #333;
            font-size: 14px;
            border: 1px solid #ccc;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin: 5px;
            overflow: visible;">
        <legend style="
        padding: 5px 10px;
        border: 1px solid #1f497d;
        background: #e4f0fb;
        color: #1f497d;
        border-radius: 8px;
        font-size: 14px;
            ">
        Images
        </legend>
            <div style="display: none; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="sound-file" style="flex: 1; text-align: left;">Sound File:</label>
            <span id="sound-file" style="flex: 2; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">None</span>
            <button id="select-sound" style="margin-left: 8px; background: #4a6484!important; color: white!important; border: none!important; width: 28px; height: 28px; border-radius: 3px!important; cursor: pointer!important;" title="Browse for a sound file"><i class="fas fa-folder-open"></i></button>
            <button id="clear-sound" style="margin-left: 8px; background: #4a6484!important; color: white!important; width: 28px; height: 28px; border: none!important; border-radius: 3px!important; cursor: pointer!important;" title="Clear the selected sound"><i class="fas fa-times"></i></button>
        </div>
        <div style="display: none; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="fadeInAudio" style="flex: 1; text-align: left;">Fade In (ms):</label>
            <input type="number" id="fadeInAudio" value="500" style="flex: 2;">
        </div>
        <div style="display: none; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="fadeOutAudio" style="flex: 1; text-align: left;">Fade Out (ms):</label>
            <input type="number" id="fadeOutAudio" value="500" style="flex: 2;">
        </div>
        <div style="display: none; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="audioDuration" style="flex: 1; text-align: left;">Duration (ms):</label>
            <input type="number" id="audioDuration" value="3000" style="flex: 2;">
        </div>
            <div style="display: flex; align-items: left; justify-content: space-between; margin-bottom: 8px;">
        
            <div style="flex: 2; display: flex; flex-direction: column; gap: 5px;">
                ${Array(nOfSlots).fill(null).map((_, i) => `
                <div class="image-slot" data-slot="${i}" style="margin-bottom: 2px;">
                    <div style="display: flex; align-items: center; gap: 0px; margin-bottom: 0px;">
                        <button type="button" class="file-picker" style="flex-grow: 1;flex-shrink: 0;flex-basis: 24px;
                                    padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;
                                " data-slot="${i}">
                            Select Image ${i + 1}
                        </button><div style="max-width: 100px; word-wrap: break-word; font-size: 10px;">
                            <span class="image-file" data-slot="${i}" style="display: block; margin-left: 10px; flex-grow: 1;"></div>
                        <button type="button" class="clear-image" data-slot="${i}" style="display: none;width:30px;height:30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;" title="Clear image">
                            <i class="fas fa-times"></i>
                        </button>

                        <button type="button" class="configure-fx" data-slot="${i}" style="display: none;width:30px;height:30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;" title="Configure image filters">
                            <i class="fas fa-magic"></i>
                        </button>
                        <button type="button" class="configure-animation" data-slot="${i}" style="display: none;width:30px;height:30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;" title="Configure image animation">
                            <i class="fas fa-play"></i>
                        </button>
                        <button type="button" class="preview-image" data-slot="${i}" style="display: none;width:30px;height:30px;padding: 3px 8px!important;
                                    background: #4a6484!important;
                                    color: white!important;
                                    border: none!important;
                                    border-radius: 3px!important;
                                cursor: pointer!important;" title="Preview image animation without delay">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                                                <div class="imgontoken" data-slot="${i}" style="display: none; align-items: center; gap: 3px; margin-bottom: 3px;">
                                    <input type="checkbox" class="image-on-token" data-slot="${i}" ">
                                    <label>On Token</label>
                                </div>
                    <div class="image-controls" data-slot="${i}" style="display: none; margin-top: 5px;">
                        <details style="margin-bottom: 10px;">
                            <summary style="
                                background: gray;
                                color: white;
                                padding: 3px;
                                border-radius: 3px;
                                cursor: pointer;
                                user-select: none;
                            ">
                                Image ${i + 1} Controls
                            </summary>
                            <div style="
                                background: lightgray;
                                color: black;
                                padding: 5px;
                                border-radius: 3px;
                                margin-top: 3px;
                            ">


                                <div>
                                    <label>Start Position:</label>
                                    <div style="display: flex; gap: 3px; margin-bottom: 3px;">
                                        <div style="flex: 1;">
                                            <label>X:</label>
                                            <input type="number" class="image-x" data-slot="${i}" value="0" style="width: 100%;">
                                        </div>
                                        <div style="flex: 1;">
                                            <label>Y:</label>
                                            <input type="number" class="image-y" data-slot="${i}" value="0" style="width: 100%;">
                                        </div>
                                    </div>
                                <div>
                                    <button type="button" class="image-target" data-slot="${i}" style="display: block;width:30px;height:30px;padding: 3px 8px!important;
                                        background: #4a6484!important;
                                        color: white!important;
                                        border: none!important;
                                        border-radius: 3px!important;
                                        cursor: pointer!important;" title="Target Image">
                                        <i class="fas fa-crosshairs"></i>
                                    </button>
                                </div>
                                <div>
                                    <label>Size:</label>
                                    <div style="display: flex; gap: 3px; margin-bottom: 3px;">
                                        <div style="flex: 1;">
                                            <label>Width:</label>
                                            <input type="number" class="image-size-width" data-slot="${i}" value="0" style="width: 100%;">
                                        </div>
                                        <div style="flex: 1;">
                                            <label>Height:</label>
                                            <input type="number" class="image-size-height" data-slot="${i}" value="0" style="width: 100%;">
                                        </div>
                                    </div>
                                <div>
                                    <label>Scale:</label>
                                    <input type="number" class="image-scale" data-slot="${i}" value="1" step="0.1" style="width: 100%;">
                                </div>
                                <div>
                                    <label>Opacity:</label>
                                    <input type="number" class="image-opacity" data-slot="${i}" value="1" step="0.1" min="0" max="1" style="width: 100%;">
                                </div>
                                <div>
                                    <label>Mirror:</label>
                                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                                        <label><input type="checkbox" class="image-mirror-x" data-slot="${i}"> Flip X</label>
                                        <label><input type="checkbox" class="image-mirror-y" data-slot="${i}"> Flip Y</label>
                                    </div>
                                </div>

                                <div>
                                    <label>Duration (ms):</label>
                                    <input type="number" class="image-duration" data-slot="${i}" value="3000" style="width: 100%;">
                                </div>
                                <div>
                                    <label>Delay (ms):</label>
                                    <input type="number" class="image-delay" data-slot="${i}" value="0" style="width: 100%;">
                                </div>
                                <div>
                                    <label>Fade In (ms):</label>
                                    <input type="number" class="image-fadeInDuration" data-slot="${i}" value="500" min="0" style="width: 100%;">
                                </div>
                                <div>
                                    <label>Fade Out (ms):</label>
                                    <input type="number" class="image-fadeOutDuration" data-slot="${i}" value="500" min="0" style="width: 100%;">
                                </div>
                                <div>
                                    <label>Z-Index:</label>
                                    <input type="number" class="image-zindex" data-slot="${i}" value="1" min="1" style="width: 100%;">
                                </div>
                            </div>
                        </details>
                    </div>
                    <div class="token-image-controls" data-slot="${i}" style="display: none;">
                    <details style="margin-bottom: 10px;">
                            <summary style="
                                background: gray;
                                color: white;
                                padding: 3px;
                                border-radius: 3px;
                                cursor: pointer;
                                user-select: none;
                            ">
                            Token Image ${i + 1} Controls
                            </summary>
                            <div style="
                                background: lightgray;
                                color: black;
                                padding: 5px;
                                border-radius: 3px;
                                margin-top: 3px;
                            ">
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Scale:</label>
                            <input type="number" class="image-scale" data-slot="${i}" value="1" step="0.1" style="width: 70px;">
                         </div>
                         <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">   
                            <label>Width:</label>
                            <input type="number" class="image-size-width" data-slot="${i}" value="0" style="width: 100%;">
                            <label>Height:</label>
                            <input type="number" class="image-size-height" data-slot="${i}" value="0" style="width: 100%;">
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Opacity:</label>
                            <input type="number" class="image-opacity" data-slot="${i}" value="1" step="0.1" min="0" max="1" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Duration (ms):</label>
                            <input type="number" class="image-duration" data-slot="${i}" value="3000" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Delay (ms):</label>
                            <input type="number" class="image-delay" data-slot="${i}" value="0" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Z-Index:</label>
                            <input type="number" class="image-zindex" data-slot="${i}" value="1" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Fade In (ms):</label>
                            <input type="number" class="image-fadeInDuration" data-slot="${i}" value="500" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Fade Out (ms):</label>
                            <input type="number" class="image-fadeOutDuration" data-slot="${i}" value="500" style="width: 70px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Mirror X:</label>
                            <input type="checkbox" class="image-mirror-x" data-slot="${i}">
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                            <label>Mirror Y:</label>
                            <input type="checkbox" class="image-mirror-y" data-slot="${i}">
                        </div></div>
                    </div>
                </div>
                `).join('')}
            </div>
            </fieldset>
            
    </div>
    <div class="settings-column4" style="grid-column: 4;">
    <fieldset style="
        border-radius: 8px;
        padding: 10px;
        background: #f9f9f9;
        color: #333;
        font-size: 14px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin: 5px;
        max-height: 770px;
        overflow-y: auto;
    ">
        <legend style="
            padding: 5px 10px;
            border: 1px solid #1f497d;
            background: #e4f0fb;
            color: #1f497d;
            border-radius: 8px;
            font-size: 14px;
        ">
            Sound Effects
        </legend>
    <div class="sound-effects-container">
            ${Array(nOfSlots).fill(null).map((_, i) => `
                <details class="sound-slot" data-slot="${i}" style="
                    margin-bottom: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 5px;
                ">
                    <summary style="
                        padding: 5px;
                        cursor: pointer;
                        user-select: none;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <span>Sound Effect ${i + 1}</span>
                        <div class="button-group" style="display: flex; gap: 5px;">
                            <button class="preview-sound" data-slot="${i}" style="
                                padding: 3px 8px;
                                background: #4a6484;
                                color: white;
                                border: none;
                                border-radius: 3px;
                                cursor: pointer;
                            ">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </summary>
                    <div style="padding: 10px;">
                        <div style="margin-bottom: 10px;">
                            <div style="display: flex; justify-content: left;  margin-bottom: 5px;">
                                <button class="sound-recorder" data-slot="${i}" style="
                                    padding: 3px 8px;
                                    background: #4a6484;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    width: 30px;
                                    height: 30px;
                                    margin-right: 5px;
                                "><i class="fas fa-microphone"></i></button>
                                <button class="sound-stop-recorder" data-slot="${i}" style="
                                    padding: 3px 8px;
                                    background: #4a6484;
                                    color: red;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    width: 30px;
                                    height: 30px;
                                    margin-right: 5px;
                                "><i class="fas fa-stop"></i></button>
                            </div>
                            <div style="display: flex; justify-content: left;">
                                
                                <button class="sound-picker" data-slot="${i}" style="
                                    padding: 3px 8px;
                                    background: #4a6484;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    width: 30px;
                                    height: 30px;
                                    margin-right: 5px;
                                "><i class="fas fa-folder-open"></i></button>
                                                    <button type="button" class="clear-sounds" data-slot="${i}" 
                                                    style="
                                padding: 3px 8px;
                                background: #4a6484;
                                color: white;
                                border: none;
                                border-radius: 3px;
                                cursor: pointer;
                                display: show;
                                width:30px;
                                height:30px;
                                ">
                            <i class="fas fa-times"></i>
                        </button>
                            </div>
                            <div class="sound-file-display" data-slot="${i}" style="
                                font-style: italic;
                                color: #666;
                                margin-top: 5px;
                                max-width: 100px; word-wrap: break-word; font-size: 10px;
                            ">No file selected</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label>Delay (ms):</label>
                            <input type="number" class="sound-delay" data-slot="${i}" value="0" min="0" style="width: 100px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label>Duration (ms):</label>
                            <input type="number" class="sound-duration" data-slot="${i}" value="0" min="0" style="width: 100px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label>Fade In (ms):</label>
                            <input type="number" class="sound-fadeIn" data-slot="${i}" value="500" min="0" style="width: 100px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label>Fade Out (ms):</label>
                            <input type="number" class="sound-fadeOut" data-slot="${i}" value="500" min="0" style="width: 100px;">
                        </div>
    <div style="margin-bottom: 10px;">
        <label>Time Start (ms):</label>
        <input type="number" class="sound-timeStart" data-slot="${i}" value="0" min="0" style="width: 100px;">
    </div>
    <div style="margin-bottom: 10px;">
        <label>Time End (ms):</label>
        <input type="number" class="sound-timeEnd" data-slot="${i}" value="0" min="0" style="width: 100px;">
    </div>
    <div style="margin-bottom: 10px;">
        <label>Volume:</label>
        <input type="number" class="sound-volume" data-slot="${i}" value="0.8" min="0" max="1" step="0.1" style="width: 100px;">
    </div>


                    </div>
                </details>
            `).join('')}
        </div>


        </div>
    </fieldset>
    </div> 
    </div>

            
    
        `;
    }

    const myDialogOptions = {
    width: 1100
    };
    // Open a dialog to customize text, styles, audio, and image options
    new Dialog({
        title: "DMKal's  Animator",
        content: `
            <form>${generateTextStyleForm(defaultTextStyle)}</form>
        `,
        buttons: {
            ok: {
                label: "Save & Close",
                callback: async (html) => {
                    ensureTextDataIntegrity();
                    ensureimgDataIntegrity();
                    
                    // Check if at least one text or image is configured
                    const hasContent = window.textData.some(t => t.text.trim()) || imgData.some(img => img.file);
                    
                    if (!hasContent) {
                        ui.notifications.warn("You must enter some text or add an image!");
                        return;
                    }

                    // Get template name from the new input field
                    const templateName = html.find('#template-text').val().trim() || 'Unnamed Template';

                    const template = createTemplate(html);
                    template.name = templateName;  // Set the template name
                    const rectStyle = getRectStyle(html);
                    const macro = this;

                    const templates = getSetting("splash");
                    templates.push(template);
                    await setSetting("splash", templates);
                    ui.notifications.info(`Template "${templateName}" saved. Total templates: ${templates.length}`);

                    const animationCode = generateAnimationCode(template, rectStyle);
                    //eval(animationCode);

                    if (getFormValue(html, '#saveMacro', 'bool')) {
                        // Use the template name for the macro name
                        const macroName = templateName.substring(0, 15);
                        await Macro.create({
                            name: macroName,
                            type: "script",
                            scope: "global",
                            command: animationCode,
                            img: "icons/svg/dice-target.svg"
                        });
                        ui.notifications.info(`Macro "${macroName}" created successfully.`);
                    }
                }
            },

            cancel: {
                label: "Cancel"
            }
        },
        default: "ok",
        render: async (html) => {
            const macro = this;
            const templates = getSetting("splash");
            const templateSelect = html.find("#template-select");

    html.find('.sound-recorder').click(async function() {
        const slot = $(this).data('slot');
        try {
            await startRecording(slot);
            $(this).css('background-color', 'red');

            $(this).siblings('.sound-stop-recorder').click(() => {
                stopRecording(slot);
                $(this).css('background-color', '');
            });
        } catch (err) {
            ui.notifications.error('Error accessing microphone: ' + err.message);
        }
    });


            templates.forEach((template, index) => {
                const displayName = template.name || `Template ${index + 1}`;
                templateSelect.append(`<option value="${index}">${displayName}</option>`);
            });

    templateSelect.change(() => {
        const selectedIndex = parseInt(templateSelect.val());
        const selectedTemplate = templates[selectedIndex];
        if (selectedTemplate) {
            loadTemplate(html, selectedTemplate);
        }
    });

            html.find('.section-content').hide();
            html.find('.collapse-indicator').text('▶');
            html.find('.section-header').click(function() {
                const content = $(this).next('.section-content');
                content.slideToggle(200);
                const indicator = $(this).find('.collapse-indicator');
                indicator.text(content.is(':visible') ? '▼' : '▶');
            });

            // Add click handler for delete-template button
            html.find("#delete-template").off("click").on("click", async function() {
                const selectedIndex = parseInt(templateSelect.val());
                if (selectedIndex === undefined || isNaN(selectedIndex)) {
                    ui.notifications.warn("Please select a template to delete.");
                    return;
                }
                
                if (selectedIndex >= 0 && selectedIndex < templates.length) {
                    const templateName = templates[selectedIndex].name || `Template ${selectedIndex + 1}`;
                    templates.splice(selectedIndex, 1);
                    await setSetting("splash", templates);
                    
                    // Update the dropdown list
                    templateSelect.find(`option[value='${selectedIndex}']`).remove();
                    
                    ui.notifications.info(`Template "${templateName}" deleted. Total templates: ${templates.length}`);
                }
            });
        }
    }, myDialogOptions).render(true);

    // Add click handler for delete-template button


    // Restore sound file picker
    $(document).off("click", "#select-sound").on("click", "#select-sound", async () => {
        const selectedFile = await filepickerPromise("/");
        if (selectedFile) {
            $("#sound-file").text(selectedFile);
        }
    });

    // Add clear sound button functionality
    $(document).off("click", "#clear-sound").on("click", "#clear-sound", () => {
        $("#sound-file").text("None");
    });
    // Add clear sounds button functionality
    $(document).off("click", ".clear-sounds").on("click", ".clear-sounds", function() {  
        ensuresoundDataIntegrity();
        const slot = parseInt($(this).data("slot"));
        console.log("Clearing sound file for slot:", slot);
        
        if (slot >= 0 && slot < nOfSlots) {
            soundData[slot] = {
                file: null,
                delay: 0,
                duration: 1000,
                fadeIn: 500,
                fadeOut: 500
            };
            $(`.sound-file-display[data-slot="${slot}"]`).text("None");
            $(`.sound-delay[data-slot="${slot}"]`).val(0);
            $(`.sound-duration[data-slot="${slot}"]`).val(1000);
            $(`.sound-fade-in[data-slot="${slot}"]`).val(500);
            $(`.sound-fade-out[data-slot="${slot}"]`).val(500);
            $(`.clear-sounds[data-slot="${slot}"]`).hide();
        }
    });

    // Add event handlers for text slots
    $(document).off("click", ".text-header").on("click", ".text-header", function() {
        const content = $(this).next('.text-content');
        content.slideToggle();
        const indicator = $(this).find('.collapse-indicator');
        indicator.text(content.is(':visible') ? '▼' : '▶');
    });

    // Handle text input changes
    $(document).off("input change", ".text-input, .text-x, .text-y, .text-duration, .text-delay")
        .on("input change", ".text-input, .text-x, .text-y, .text-duration, .text-delay", function() {
            ensureTextDataIntegrity();
            const $this = $(this);
            const slot = parseInt($this.attr("data-slot"));
            const className = $this.attr("class").split(" ")[0];
            
            if (slot >= 0 && slot < nOfSlots) {
                if (className === 'text-input') {
                    window.textData[slot].text = $this.val();
                } else {
                    const property = className.replace('text-', '');
                    window.textData[slot][property] = parseFloat($this.val()) || 0;
                }
                console.log(`Updated text slot ${slot}:`, window.textData[slot]);
            }
        });

    // Handle "On Token" checkbox changes
    $(document).off("change", ".text-on-token").on("change", ".text-on-token", function() {
        ensureTextDataIntegrity();
        const $this = $(this);
        const slot = parseInt($this.attr("data-slot"));
        const isChecked = $this.prop("checked");
        
        if (slot >= 0 && slot < nOfSlots) {
            window.textData[slot].onToken = isChecked;
            const $textControls = $(`.text-controls[data-slot="${slot}"]`);
            const $tokenTextControls = $(`.token-text-controls[data-slot="${slot}"]`);
            
            $textControls.toggle(!isChecked);
            $tokenTextControls.toggle(isChecked);
            
            console.log(`Updated text slot ${slot} onToken:`, isChecked);
            
            // Enable or disable attach checkbox
            $(`.text-attach[data-slot="${slot}"]`).prop('disabled', !isChecked);
            if (!isChecked) {
                $(`.text-attach[data-slot="${slot}"]`).prop('checked', false);
            }
        }
    });

    // Handle text attach checkbox changes
    $(document).off("change", ".text-attach").on("change", ".text-attach", function() {
        ensureTextDataIntegrity();
        const $this = $(this);
        const slot = parseInt($this.attr("data-slot"));
        const isChecked = $this.prop("checked");
        
        if (slot >= 0 && slot < nOfSlots) {
            window.textData[slot].attach = isChecked;
            console.log(`Updated text slot ${slot} attach:`, isChecked);
        }
    });

    // Style configuration dialog
    $(document).off("click", ".configure-style").on("click", ".configure-style", async function() {
        const slot = $(this).data("slot");
        ensureTextDataIntegrity();
        
        const currentStyle = window.textData[slot].style;
        const currentX = window.textData[slot].x || 0;
        const currentY = window.textData[slot].y || 0;
        
        const styleDialog = new Dialog({
            title: `Configure Style - Text ${slot + 1}`,
            content: `
                <style>
                    #textstyle-dialog {
width: auto !important;
    height: auto !important;
    max-width: 800px !important;
    /* background-color: rgba(30, 30, 30, 0.95) !important; */
    /* border: 2px solid #4a90e2 !important; */
    border-radius: 4px !important;
    /* box-shadow: 0 4px 20px rgba(74, 144, 226, 0.3) !important; */
    backdrop-filter: blur(5px) !important;
    overflow: auto !important;
    /* color: #fff !important; */
    padding: 6px;
                    }
                    fieldset {
                        border: 1px solid #4a90e2;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        padding: 10px;
                    }
                    legend {
                        padding: 0 10px;
                        background: #4a90e2;
                        color: #fff;
                        border-radius: 5px;
                    }
                    .input-group {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        margin-bottom: 10px;
                    }
                    .input-group label {
                        flex: 1;
                    }
                    .input-group input, .input-group select {
                        flex: 2;
                    }
                    .column {
                        display: inline-block;
                        vertical-align: top;
                        width: 48%;
                        padding: 1%;
                    }
                </style>
                <div class="text-style-config">
                    <div class="column">
                        <fieldset>
                            <legend>Text Appearance</legend>
                            <div class="input-group">
                                <label>Font Size:</label>
                                <input type="number" class="style-fontSize" value="${currentStyle.fontSize}" min="8" max="144">
                            </div>
                            <div class="input-group">
                                <label>Fill Color:</label>
                                <input type="color" class="style-fill" value="${currentStyle.fill}">
                            </div>
                            <div class="input-group">
                                <label>Stroke:</label>
                                <input type="color" class="style-stroke" value="${currentStyle.stroke}">
                            </div>
                            <div class="input-group">
                                <label>Stroke Thickness:</label>
                                <input type="number" class="style-strokeThickness" value="${currentStyle.strokeThickness}" min="0" max="20">
                            </div>
                            <div class="input-group">
                                <label>Text Align:</label>
                                <select class="style-align">
                                    <option value="left" ${currentStyle.align === 'left' ? 'selected' : ''}>Left</option>
                                    <option value="center" ${currentStyle.align === 'center' ? 'selected' : ''}>Center</option>
                                    <option value="right" ${currentStyle.align === 'right' ? 'selected' : ''}>Right</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Font Family:</label>
                                <select class="style-fontFamily">
                                    ${FontConfig.getAvailableFontChoices ? 
                                        Object.keys(FontConfig.getAvailableFontChoices()).map(font => 
                                            `<option value="${font}" ${font === currentStyle.fontFamily ? 'selected' : ''}>${font}</option>`
                                        ).join('') : 
                                        `<option value="Arial" ${currentStyle.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                                        <option value="Times New Roman" ${currentStyle.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                                        <option value="Courier New" ${currentStyle.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                                        <option value="Georgia" ${currentStyle.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                                        <option value="Verdana" ${currentStyle.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                                        <option value="Helvetica" ${currentStyle.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                                        <option value="Tahoma" ${currentStyle.fontFamily === 'Tahoma' ? 'selected' : ''}>Tahoma</option>
                                        <option value="Impact" ${currentStyle.fontFamily === 'Impact' ? 'selected' : ''}>Impact</option>
                                        <option value="Comic Sans MS" ${currentStyle.fontFamily === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans MS</option>`
                                    }
                                </select>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>Shadow & Effects</legend>
                            <div class="input-group">
                                <label>Drop Shadow:</label>
                                <input type="checkbox" class="style-dropShadow" ${currentStyle.dropShadow ? 'checked' : ''}>
                            </div>
                            <div class="input-group">
                                <label>Shadow Color:</label>
                                <input type="color" class="style-dropShadowColor" value="${currentStyle.dropShadowColor}">
                            </div>
                            <div class="input-group">
                                <label>Shadow Blur:</label>
                                <input type="number" class="style-dropShadowBlur" value="${currentStyle.dropShadowBlur}" min="0" max="20">
                            </div>
                            <div class="input-group">
                                <label>Shadow Angle:</label>
                                <input type="number" class="style-dropShadowAngle" value="${currentStyle.dropShadowAngle}" step="0.1">
                            </div>
                            <div class="input-group">
                                <label>Shadow Distance:</label>
                                <input type="number" class="style-dropShadowDistance" value="${currentStyle.dropShadowDistance}" min="0" max="20">
                            </div>
                            <div class="input-group">
                                <label>Rotate:</label>
                                <input type="number" class="style-rotate" value="${currentStyle.rotate || 0}" min="0" max="360">
                            </div>
                        </fieldset>
                    </div>
                    <div class="column">
                        <fieldset>
                            <legend>Animation & Movement</legend>
                            <div class="input-group">
                                <label>Fade In (ms):</label>
                                <input type="number" class="style-fadeInDuration" value="${currentStyle.fadeInDuration || 500}" min="0" max="5000">
                            </div>
                            <div class="input-group">
                                <label>Fade Out (ms):</label>
                                <input type="number" class="style-fadeOutDuration" value="${currentStyle.fadeOutDuration || 500}" min="0" max="5000">
                            </div>
                            <div class="input-group">
                                <label>Move X by:</label>
                                <input type="number" class="style-moveXBy" value="${currentStyle.moveXBy}" min="-1000" max="1000">
                            </div>
                            <div class="input-group">
                                <label>Move Y by:</label>
                                <input type="number" class="style-moveYBy" value="${currentStyle.moveYBy}" min="-1000" max="1000">
                            </div>
                            <div class="input-group">
                                <label>Movement Duration (ms):</label>
                                <input type="number" class="style-movementDuration" value="${currentStyle.movementDuration}" min="0" max="5000">
                            </div>
                            <div class="input-group">
                                <label>Movement Ease:</label>
                                <select class="movement-ease">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${window.textData[slot].movementEase === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Scale X To:</label>
                                <input type="number" class="style-scaleXTo" value="${currentStyle.scaleXTo || 1}" min="0" max="10" step="0.1">
                            </div>
                            <div class="input-group">
                                <label>Scale Y To:</label>
                                <input type="number" class="style-scaleYTo" value="${currentStyle.scaleYTo || 1}" min="0" max="10" step="0.1">
                            </div>
                            <div class="input-group">
                                <label>Scale Duration (ms):</label>
                                <input type="number" class="style-scaleDuration" value="${currentStyle.scaleDuration || 1000}" min="0" max="5000">
                            </div>
                            <div class="input-group">
                                <label>Scale Ease:</label>
                                <select class="style-scaleEase">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${currentStyle.scaleEase === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>Wrapping</legend>
                            <div class="input-group">
                                <label>Wrap Width:</label>
                                <input type="number" class="style-wordWrapWidth" value="${currentStyle.wordWrapWidth}" min="100" max="2000">
                            </div>
                        </fieldset>
                    </div>
                </div>
            `,
            buttons: {
                apply: {
                    label: "Apply",
                    callback: (html) => {
                        const newStyle = {
                            fontSize: parseInt(html.find(".style-fontSize").val()) || 72,
                            fill: html.find(".style-fill").val(),
                            stroke: html.find(".style-stroke").val(),
                            strokeThickness: parseInt(html.find(".style-strokeThickness").val()) || 5,
                            dropShadow: html.find(".style-dropShadow").prop('checked'),
                            dropShadowColor: html.find(".style-dropShadowColor").val(),
                            dropShadowBlur: parseInt(html.find(".style-dropShadowBlur").val()) || 4,
                            dropShadowAngle: parseFloat(html.find(".style-dropShadowAngle").val()) || 0.5,
                            dropShadowDistance: parseInt(html.find(".style-dropShadowDistance").val()) || 5,
                            wordWrap: true,
                            align: html.find(".style-align").val(),
                            fontFamily: html.find(".style-fontFamily").val(),
                            wordWrapWidth: parseInt(html.find(".style-wordWrapWidth").val()) || 900,
                            fadeInDuration: parseInt(html.find(".style-fadeInDuration").val()) || 500,
                            fadeOutDuration: parseInt(html.find(".style-fadeOutDuration").val()) || 500,
                            moveXBy: parseInt(html.find(".style-moveXBy").val()) || 0,
                            moveYBy: parseInt(html.find(".style-moveYBy").val()) || 0,
                            movementDuration: parseInt(html.find(".style-movementDuration").val()) || 1000,
                            movementEase: html.find(".movement-ease").val() || 'linear',
                            scaleXTo: parseFloat(html.find(".style-scaleXTo").val()) || 1,
                            scaleYTo: parseFloat(html.find(".style-scaleYTo").val()) || 1,
                            scaleDuration: parseInt(html.find(".style-scaleDuration").val()) || 1000,
                            scaleEase: html.find(".style-scaleEase").val() || 'linear',
                            rotate: parseInt(html.find(".style-rotate").val()) || 0
                        };
                        window.textData[slot].style = newStyle;
                        window.textData[slot].movementEase = newStyle.movementEase;
                        console.log(`Updated style for text ${slot + 1}:`, newStyle);
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            },
        });
        styleDialog.render(true, { id: "textstyle-dialog" });
    });

    // Handle sound file selection
    $(document).off("click", ".sound-picker").on("click", ".sound-picker", async function() {
        const slot = $(this).data("slot");
        console.log(`Picking sound file for slot ${slot}`);
        
        try {
            const selectedFile = await filepickerPromise("");
            console.log(`Selected file: ${selectedFile}`);
            
            ensuresoundDataIntegrity();
            
            soundData[slot] = {
                file: selectedFile,
                delay: parseInt($(`.sound-delay[data-slot="${slot}"]`).val()) || 0,
                duration: parseInt($(`.sound-duration[data-slot="${slot}"]`).val()) || 0,
                fadeIn: parseInt($(`.sound-fade-in[data-slot="${slot}"]`).val()) || 500,
                fadeOut: parseInt($(`.sound-fade-out[data-slot="${slot}"]`).val()) || 500,
                timeStart: parseInt($(`.sound-timeStart[data-slot="${slot}"]`).val()) || 0,
                timeEnd: parseInt($(`.sound-timeEnd[data-slot="${slot}"]`).val()) || 0,
                volume: parseFloat($(`.sound-volume[data-slot="${slot}"]`).val()) || 0.8
            };
            
            console.log(`Updated slot ${slot} with file ${selectedFile}`, soundData[slot]);

            // Update UI
            $(`.sound-file-display[data-slot="${slot}"]`).text(selectedFile);
            $(`.clear-sounds[data-slot="${slot}"]`).show();
        } catch (error) {
            console.error("Error selecting file:", error);
            ui.notifications.error("Failed to select file");
        }
    });

    // Handle sound delay changes
    $(document).off("change", ".sound-delay, .sound-duration, .sound-fadeIn, .sound-fadeOut, .sound-timeStart, .sound-timeEnd, .sound-volume")
    .on("change", ".sound-delay, .sound-duration, .sound-fadeIn, .sound-fadeOut, .sound-timeStart, .sound-timeEnd, .sound-volume", function() {
        ensuresoundDataIntegrity();
        const slot = $(this).data("slot");
        const value = $(this).hasClass('sound-volume') ? parseFloat($(this).val()) || 0 : parseInt($(this).val()) || 0;
        const property = $(this).attr("class").split("-")[1];
        
        if (soundData[slot]) {
            soundData[slot][property] = value;
            console.log(`Updated ${property} for sound ${slot} to ${value}`);
        }
    });

    // Function to show animation timeline using Mermaid
    async function showAnimationTimeline() {
        ensureTextDataIntegrity();
        ensureimgDataIntegrity();
        ensuresoundDataIntegrity();
    
        const timelineItems = {
            text: [],
            sound: [],
            image: []
        };
        let maxEndTime = 0;
        let scale = 1;
    
        const processItem = async (item, index, type) => {
            if (item && (item.text?.trim() || item.file)) {
                const startTime = item.delay;
                let duration = item.duration;
                let actualDuration = null;
                
                if (type === 'sound') {
                    try {
                        const sound = new foundry.audio.Sound(item.file);
                        await sound.load();
                        actualDuration = sound.duration * 1000; // Convert to milliseconds
                        // Add this line to store actualDuration in the soundData array
                        soundData[index].actualDuration = actualDuration;
                        // Only use actual duration if item.duration is 0 or not set
                        if (!duration || duration === 0) {
                            duration = actualDuration;
                        }
                    } catch (error) {
                        console.warn(`Could not load sound duration for ${item.file}:`, error);
                        if (!duration || duration === 0) {
                            duration = 3000; // Fallback duration if loading fails and no duration specified
                        }
                    }
                }
                
                const endTime = startTime + duration;
                maxEndTime = Math.max(maxEndTime, endTime);
                timelineItems[type].push({
                    type,
                    index,
                    startTime,
                    endTime,
                    duration,
                    actualDuration,  // Store the actual file duration
                    content: type === 'text' 
                        ? item.text.substring(0, 20) + (item.text.length > 20 ? '...' : '')
                        : item.file.split('/').pop(),
                    animation: type === 'text' || type === 'image' ? getAnimationInfo(item) : null,
                    zIndex: type === 'image' ? (item.zIndex || 1) : null,
                    fadeInDuration: type === 'text' ? item.style.fadeInDuration : (type === 'sound' ? item.fadeIn : item.fadeInDuration) || 500,
                    fadeOutDuration: type === 'text' ? item.style.fadeOutDuration : (type === 'sound' ? item.fadeOut : item.fadeOutDuration) || 500,
                    timeStart: type === 'sound' ? (item.timeStart || 0) : null,
                    timeEnd: type === 'sound' ? (item.timeEnd || 0) : null
                });
            }
        };
    
        const getAnimationInfo = (item) => {
            let info = [];
            if (item.style) {
                if (item.style.moveXBy !== 0 || item.style.moveYBy !== 0) {
                    info.push(`Move: (${item.style.moveXBy}, ${item.style.moveYBy})`);
                }
                if (item.style.scaleXTo !== 1 || item.style.scaleYTo !== 1) {
                    info.push(`Scale: (${item.style.scaleXTo}, ${item.style.scaleYTo})`);
                }
                if (item.style.rotate !== 0) {
                    info.push(`Rotate: ${item.style.rotate}°`);
                }
            }
            return info.join(', ');
        };
    
        // Process all items in parallel
        await Promise.all([
            ...window.textData.map((text, index) => processItem(text, index, 'text')),
            ...soundData.map((sound, index) => processItem(sound, index, 'sound')),
            ...imgData.map((img, index) => processItem(img, index, 'image'))
        ]);
    
        timelineItems.image.sort((a, b) => b.zIndex - a.zIndex);
    
        const totalDuration = maxEndTime;
        const timelineWidth = Math.max(800, totalDuration / 10);
    
        const timelineHTML = `
            <style>
                #timeline-dialog {
                    width: auto !important;
                    height: auto !important;
                    max-width: 800px !important;
                    
                    border: 2px solid #4a90e2 !important;
                    border-radius: 10px !important;
                    box-shadow: 0 4px 20px rgba(74, 144, 226, 0.3) !important;
                    backdrop-filter: blur(5px) !important;
                    overflow: auto !important;
                    
                }
                #timeline-dialog:hover {
                    box-shadow: 0 6px 25px rgba(74, 144, 226, 0.5);
                }
                .timeline-container {
                    overflow-x: auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    position: relative;
                }
                .selection-box {
                    position: absolute;
                    border: 1px solid #4a90e2;
                    background: rgba(74, 144, 226, 0.1);
                    pointer-events: none;
                    z-index: 1000;
                }
                .timeline {
                    position: relative;
                    backgroundColor: #f0f0f0;
                    width: ${timelineWidth}px;
                    margin-left: 110px; /* Match label width */
                    background-image: repeating-linear-gradient(
                        90deg,
                        rgba(0, 0, 0, 0.1) 0px,
                        rgba(0, 0, 0, 0.1) 1px,
                        transparent 1px,
                        transparent ${100 * scale}px
                    );
                }
                .timeline-header {
                    height: 30px;
                    position: sticky;
                    top: 0;
                    margin-bottom: 10px;
                    z-index: 100;
                }
                .time-marker {
                    position: absolute;
                    top: 0;
                    width: 2px;
                    height: 10px;
                    background-color: #666;
                }
                .time-label {
                    position: absolute;
                    top: 15px;
                    transform: translateX(-50%);
                    font-size: 12px;
                    
                    white-space: nowrap;
                }
                .timeline-item {
                    height: 35px;
                    margin-bottom: 10px;
                    position: relative;
                    overflow: visible; /* Allow bars to overflow */
                }
                .timeline-item-label {
                    position: absolute;
                    left: -110px;
                    width: 100px;
                    text-align: right;
                    font-size: 14px;
                    line-height: 35px;
                    z-index: 2;
                    background: linear-gradient(to left, rgba(255,255,255,0.9) 0%, rgba(255,255,255,1) 100%);
                    padding-right: 10px;
                    border-radius: 8px; /* Rounded corners */
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Add shadow effect */
                }
                .timeline-item-bar {
                    position: absolute;
                    height: 100%;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: white;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    padding: 0 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    cursor: move;
                    background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 10%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 70%);
                    user-select: none;
                    z-index: 1; /* Lower z-index */
                }
                .timeline-item-bar.selected {
                    box-shadow: 0 0 0 2px #4a90e2;
                    z-index: 10;
                }
                .timeline-item-bar[data-type="text"] { 
                    background-color: #4CAF50; 
                    border: 3px ridge green;
                }
                .timeline-item-bar[data-type="image"] { 
                    background-color: #2196F3; 
                    border: 3px ridge blue;
                }
                .timeline-item-bar[data-type="sound"] { 
                    background-color: #FF9800; 
                    border: 3px ridge red;
                    position: relative;
                    overflow: hidden;
                }
                .sound-inactive-section {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    background: repeating-linear-gradient(
                        45deg,
                        rgba(255, 0, 0, 0.15),
                        rgba(255, 0, 0, 0.15) 5px,
                        rgba(255, 0, 0, 0.3) 5px,
                        rgba(255, 0, 0, 0.3) 10px
                    );
                    z-index: 1;
                    right: 0; /* Position at the end */
                }
                .sound-timestart-section {
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    background: repeating-linear-gradient(
                        -45deg,
                        rgba(0, 0, 0, 0.2),
                        rgba(0, 0, 0, 0.2) 5px,
                        rgba(0, 0, 0, 0.3) 5px,
                        rgba(0, 0, 0, 0.3) 10px
                    );
                    z-index: 1;
                }
                .timeline-item-bar[data-type="sound"] > span {
                    position: relative;
                    z-index: 2;
                }
                .timeline-item-animation {
                    font-size: 9px;
                    opacity: 0.7;
                }
                .timeline-item-zindex {
                    position: absolute;
                    right: 5px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    align-items: center;
                }
                .zindex-button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 0 2px;
                }
            </style>
            <div class="timeline-container">
                <div class="timeline">
                    <div class="timeline-header">
                        ${Array.from({length: Math.ceil(totalDuration / 1000)}, (_, i) => `
                            <div class="time-marker" style="left: ${i * 100 * scale}px;"></div>
                            <div class="time-label" style="left: ${i * 100 * scale}px;">${i}s</div>
                        `).join('')}
                    </div>
                    ${Object.entries(timelineItems).flatMap(([type, items]) => 
                        items.map((item, i) => {
                            const fadeInPercent = item.fadeInDuration / item.duration;
                            const fadeOutPercent = item.fadeOutDuration / item.duration;
                            const duration = item.endTime - item.startTime;
                            return `
                                <div class="timeline-item">
                                    <div class="timeline-item-label">${type} ${item.index + 1}</div>
                                    <div class="timeline-item-bar" 
                                        data-type="${type}"
                                        data-index="${item.index}"
                                        style="left: ${((item.startTime - (type === 'sound' ? item.timeStart || 0 : 0)) / 10) * scale}px; 
                                                width: ${duration / 10 * scale}px;
                                                background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) ${fadeInPercent * 100}%, rgba(0,0,0,0.7) ${100 - fadeOutPercent * 100}%, rgba(0,0,0,0) 100%);
                                                ${type === 'sound' && (item.timeStart > 0 || item.timeEnd > 0) ? `
                                                    --time-start-width: ${(item.timeStart / duration) * 100}%;
                                                    --time-start: ${item.timeStart}ms;
                                                    --time-end-width: ${(item.timeEnd / duration) * 100}%;
                                                    --time-end: ${item.timeEnd}ms;
                                                ` : ''}
                                        "
                                        title="${item.content}\nStart: ${item.startTime}ms\nEnd: ${item.endTime}ms${item.animation ? '\nAnimation: ' + item.animation : ''}\nFadeIn: ${item.fadeInDuration}ms\nFadeOut: ${item.fadeOutDuration}ms">
                                        ${type === 'sound' && item.timeStart > 0 ? 
                                            `<div class="sound-timestart-section" style="width: ${(item.timeStart / duration) * 100}%"></div>` : 
                                            ''}
                                        ${type === 'sound' && item.timeEnd > 0 ? 
                                            `<div class="sound-inactive-section" style="width: ${(item.timeEnd / duration) * 100}%"></div>` : 
                                            ''}
                                        <span>${item.content}</span>
                                        ${item.animation ? `<div class="timeline-item-animation">${item.animation}</div>` : ''}
                                        ${type === 'image' ? `
                                            <div class="timeline-item-zindex">
                                                <button class="zindex-button decrease-zindex">-</button>
                                                <span class="zindex-value">${item.zIndex}</span>
                                                <button class="zindex-button increase-zindex">+</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        })
                    ).join('')}
                </div>
                <div class="timeline-legenda" style="margin-top: 20px; font-size: 14px; color: #333; text-align: center; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
                    <strong>Timeline Controls:</strong> Drag horizontally to change delay. Hold <kbd>Shift</kbd> and drag to change duration. Use <kbd>Mouse Wheel</kbd> to Zoom. <kbd>Right Click</kbd> on a bar to access additional options. You can select multiple bars at once by creation a selection box.
                </div>
            </div>
        `;
    
        const timelineD = new Dialog({
            title: "Animation Timeline",
            content: timelineHTML,
            buttons: {
                close: {
                    label: "Close"
                }
            },
            render: (html) => {
                const timelineContainer = html.find('.timeline-container')[0];
                const timeline = html.find('.timeline')[0];
                
                // Add drag and drop event listeners after timeline is created
                if (timeline) {
                    timeline.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        timeline.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    });
    
                    timeline.addEventListener('dragleave', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        timeline.style.backgroundColor = '';
                    });
    
                    timeline.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        timeline.style.backgroundColor = '';
    
                        // Check if files were dropped
                        if (!e.dataTransfer.items || !e.dataTransfer.items.length) return;
                        
                        // Only allow single file drops
                        if (e.dataTransfer.items.length > 1) {
                            ui.notifications.error("Please drop only one file at a time");
                            return;
                        }
    
                        const item = e.dataTransfer.items[0];
                        
                        // Check if it's a file (not a folder)
                        if (item.kind !== 'file') {
                            ui.notifications.error("Please drop a file, not a folder");
                            return;
                        }
    
                        const file = item.getAsFile();
                        const fileType = file.type.split('/')[0];
    
                        // Only allow image or audio files
                        if (fileType !== 'image' && fileType !== 'audio') {
                            ui.notifications.error("Please drop only image or audio files");
                            return;
                        }
    
                        // Get the first available slot instead of using mouse position
                        let slot;
                        if (fileType === 'image') {
                            // Initialize imgData if it doesn't exist
                            if (!imgData) imgData = Array(nOfSlots).fill(null);
                            // Find first empty slot (where file property is empty or null)
                            slot = imgData.findIndex(item => !item || !item.file);
                            if (slot === -1) {
                                ui.notifications.error("No available image slots");
                                return;
                            }
                        } else if (fileType === 'audio') {
                            // Initialize soundData if it doesn't exist
                            if (!soundData) soundData = Array(nOfSlots).fill(null);
                            // Find first empty slot (where file property is empty or null)
                            slot = soundData.findIndex(item => !item || !item.file);
                            if (slot === -1) {
                                ui.notifications.error("No available sound slots");
                                return;
                            }
                        }
    
                        // Upload the file
                        try {
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const fileName = `${fileType}-${slot}-${timestamp}${file.name.substring(file.name.lastIndexOf('.'))}`;
                            const folderPath = 'animator';
    
                            await FilePicker.createDirectory('data', folderPath).catch(e => {
                                if (!e.message.includes('EEXIST')) throw e;
                            });
    
                            const newFile = new File([file], fileName, { type: file.type });
                            const response = await FilePicker.upload('data', folderPath, newFile, {});
                            
                            if (response.path) {
                                // Update the appropriate data array
                                if (fileType === 'image') {
                                    // Initialize imgData if it doesn't exist
                                    if (!imgData) imgData = Array(nOfSlots).fill(null);
                                    // Ensure the slot has the proper structure
                                    imgData[slot] = {
                                        file: response.path,
                                        x: 0,
                                        y: 0,
                                        scale: 1,
                                        opacity: 1,
                                        duration: 3000,
                                        delay: 0,
                                        moveToX: 0,
                                        moveToY: 0,
                                        move: 0,
                                        zIndex: 1,
                                        fadeInDuration: 500,
                                        fadeOutDuration: 500,
                                        mirrorX: false,
                                        mirrorY: false,
                                        onToken: false,
                                        size: {
                                            width: null,
                                            height: null,
                                            gridUnits: false
                                        },
                                        filters: {
                                            colorMatrix: {
                                                enabled: false,
                                                hue: 0,
                                                brightness: 1,
                                                contrast: 1,
                                                saturate: 0
                                            },
                                            glow: {
                                                enabled: false,
                                                distance: 10,
                                                outerStrength: 4,
                                                innerStrength: 0,
                                                color: 0xffffff,
                                                quality: 0.1,
                                                knockout: false
                                            },
                                            blur: {
                                                enabled: false,
                                                strength: 8,
                                                blur: 2,
                                                blurX: 2,
                                                blurY: 2,
                                                quality: 4,
                                                resolution: 1,
                                                kernelSize: 5
                                            }
                                        },
                                        animations: {
                                            position: [{
                                                enabled: false,
                                                moveToX: 0,
                                                moveToY: 0,
                                                duration: 1000,
                                                ease: "linear",
                                                delay: 0,
                                                gridUnits: false,
                                                fromEndX: false,
                                                fromEndY: false
                                            }],
                                            rotation: [{
                                                enabled: false,
                                                from: 0,
                                                to: 360,
                                                duration: 1000,
                                                ease: "linear",
                                                delay: 0,
                                                fromEnd: false,
                                                loop: false
                                            }],
                                            scale: [{
                                                enabled: false,
                                                fromX: 1,
                                                toX: 1,
                                                fromY: 1,
                                                toY: 1,
                                                duration: 1000,
                                                ease: "linear",
                                                delay: 0,
                                                fromEnd: false
                                            }],
                                            blur: [{
                                                enabled: false,
                                                fromStrength: 0,
                                                toStrength: 0,
                                                fromBlurX: 0,
                                                toBlurX: 0,
                                                fromBlurY: 0,
                                                toBlurY: 0,
                                                duration: 1000,
                                                ease: "linear",
                                                delay: 0,
                                                fromEnd: false
                                            }],
                                            alpha: [{
                                                enabled: false,
                                                from: 1,
                                                to: 1,
                                                duration: 1000,
                                                ease: "linear",
                                                delay: 0,
                                                fromEnd: false
                                            }]
                                        },
                                        persist: false,
                                        attachToSource: false,
                                        stretchToTarget: {
                                            enabled: false,
                                            tiling: false
                                        },
                                        belowToken: false,
                                        attachOptions: {
                                            align: "center",
                                            edge: "on",
                                            bindVisibility: true,
                                            bindAlpha: true,
                                            followRotation: true,
                                            randomOffset: false,
                                            offset: { x: 0, y: 0 }
                                        }
                                    };
                                    
                                    // Update the image file display in the main dialog
                                    const fileDisplay = document.querySelector(`.image-file[data-slot="${slot}"]`);
                                    if (fileDisplay) {
                                        fileDisplay.textContent = response.path;
                                    }
    
                                    // Show all image-related control buttons
                                    document.querySelector(`.clear-image[data-slot="${slot}"]`).style.display = 'block';
                                    document.querySelector(`.configure-fx[data-slot="${slot}"]`).style.display = 'block';
                                    document.querySelector(`.configure-animation[data-slot="${slot}"]`).style.display = 'block';
                                    document.querySelector(`.preview-image[data-slot="${slot}"]`).style.display = 'block';
                                    document.querySelector(`.image-controls[data-slot="${slot}"]`).style.display = 'block';
                                    
                                    // Show the image-specific controls
                                    $(`.imgontoken[data-slot="${slot}"]`).show();
                                    $(`.token-image-controls[data-slot="${slot}"]`).show();
    
                                } else if (fileType === 'audio') {
                                    // Initialize soundData if it doesn't exist
                                    if (!soundData) soundData = Array(nOfSlots).fill(null);
                                    soundData[slot] = {
                                        file: response.path,
                                        delay: 0,
                                        duration: 0,
                                        fadeIn: 500,
                                        fadeOut: 500,
                                    timeStart: 0,
                                    timeEnd: 0,
                                    volume: 0.8
                                    };
                                    
                                    // Update the sound file display in the main dialog
                                    const fileDisplay = document.querySelector(`.sound-file-display[data-slot="${slot}"]`);
                                    if (fileDisplay) {
                                        fileDisplay.textContent = response.path;
                                    }
    
                                    // Show the clear button (only button that needs to be shown)
                                    const clearButton = document.querySelector(`.clear-sounds[data-slot="${slot}"]`);
                                    if (clearButton) {
                                        clearButton.style.display = 'block';
                                    }
    
                                }
    
                                // Close and reopen the timeline dialog
                                if (typeof app !== 'undefined' && typeof app.close === 'function') {
                                    app.close();
                                }
    
                                // Reopen the dialog after a short delay
                                setTimeout(() => {
                                    showAnimationTimeline();
                                }, 100);
    
                            }
                        } catch (error) {
                            console.error('Error uploading file:', error);
                            ui.notifications.error("Failed to upload file");
                        }
                    });
                }
    
                const bars = html.find('.timeline-item-bar');
                let selectedBars = new Set();
                let isDraggingSelection = false;
                let selectionBox = null;
                let startX = 0;
                let startY = 0;
    
                // Create selection box element
                const createSelectionBox = (x, y) => {
                    selectionBox = document.createElement('div');
                    selectionBox.className = 'selection-box';
                    selectionBox.style.left = `${x}px`;
                    selectionBox.style.top = `${y}px`;
                    timelineContainer.appendChild(selectionBox);
                };
    
                // Update selection box size and position
                const updateSelectionBox = (currentX, currentY) => {
                    const rect = {
                        left: Math.min(startX, currentX),
                        top: Math.min(startY, currentY),
                        width: Math.abs(currentX - startX),
                        height: Math.abs(currentY - startY)
                    };
                    
                    selectionBox.style.left = `${rect.left}px`;
                    selectionBox.style.top = `${rect.top}px`;
                    selectionBox.style.width = `${rect.width}px`;
                    selectionBox.style.height = `${rect.height}px`;
                    
                    return rect;
                };
    
                // Check if an element intersects with the selection box
                const isIntersecting = (element, selectionRect) => {
                    const rect = element.getBoundingClientRect();
                    const containerRect = timelineContainer.getBoundingClientRect();
                    
                    const elementRect = {
                        left: rect.left - containerRect.left + timelineContainer.scrollLeft,
                        top: rect.top - containerRect.top,
                        right: rect.right - containerRect.left + timelineContainer.scrollLeft,
                        bottom: rect.bottom - containerRect.top
                    };
                    
                    return !(elementRect.left > selectionRect.left + selectionRect.width || 
                            elementRect.right < selectionRect.left || 
                            elementRect.top > selectionRect.top + selectionRect.height || 
                            elementRect.bottom < selectionRect.top);
                };
    
                // Handle selection box dragging
                timelineContainer.addEventListener('mousedown', (event) => {
                    // Only start selection if clicking on the container itself
                    if (!event.target.classList.contains('timeline-item-bar')) {
                        isDraggingSelection = true;
                        startX = event.clientX - timelineContainer.getBoundingClientRect().left + timelineContainer.scrollLeft;
                        startY = event.clientY - timelineContainer.getBoundingClientRect().top;
                        createSelectionBox(startX, startY);
                    }
                });
    
                document.addEventListener('mousemove', (event) => {
                    if (!isDraggingSelection || !selectionBox) return;
    
                    const currentX = event.clientX - timelineContainer.getBoundingClientRect().left + timelineContainer.scrollLeft;
                    const currentY = event.clientY - timelineContainer.getBoundingClientRect().top;
                    const selectionRect = updateSelectionBox(currentX, currentY);
    
                    // Update selected bars
                    bars.each((_, bar) => {
                        if (isIntersecting(bar, selectionRect)) {
                            if (!selectedBars.has(bar)) {
                                selectedBars.add(bar);
                                bar.classList.add('selected');
                            }
                        } else {
                            selectedBars.delete(bar);
                            bar.classList.remove('selected');
                        }
                    });
                });
    
                document.addEventListener('mouseup', () => {
                    if (isDraggingSelection && selectionBox) {
                        isDraggingSelection = false;
                        selectionBox.remove();
                        selectionBox = null;
                    }
                });
    
                bars.each((_, bar) => {
                    // Add right-click event listener for image bars
                    bar.addEventListener('contextmenu', function(event) {
                        const type = bar.getAttribute('data-type');
                        const index = parseInt(bar.getAttribute('data-index'));
                        
                        if ((type === 'image' && imgData[index]?.file) || type === 'text' || type === 'sound') {
                            event.preventDefault(); // Prevent default context menu
                            showContextMenu(event, bar);
                        }
                    });
    
                    bar.addEventListener('mousedown', function(event) {
                        if (event.target.classList.contains('zindex-button')) return;
                        event.stopPropagation(); // Prevent selection box creation when clicking on a bar
    
                        const startX = event.clientX;
                        const startPositions = new Map();
                        const startWidths = new Map();
    
                        // If clicking an unselected bar, clear other selections
                        if (!selectedBars.has(bar)) {
                            selectedBars.forEach(b => b.classList.remove('selected'));
                            selectedBars.clear();
                            selectedBars.add(bar);
                            bar.classList.add('selected');
                        }
    
                        // Store initial positions and widths for all selected bars
                        selectedBars.forEach(selectedBar => {
                            startPositions.set(selectedBar, parseInt(selectedBar.style.left));
                            startWidths.set(selectedBar, parseInt(selectedBar.style.width));
                        });
    
                        const onMouseMove = (event) => {
                            const dx = event.clientX - startX;
    
                            // Calculate the grid snap value (10ms)
                            const gridSnap = 10;
    
                            selectedBars.forEach(selectedBar => {
                                const type = selectedBar.getAttribute('data-type');
                                const index = parseInt(selectedBar.getAttribute('data-index'));
                                let dataArray;
                                switch(type) {
                                    case 'text':
                                        dataArray = window.textData;
                                        break;
                                    case 'sound':
                                        dataArray = soundData;
                                        break;
                                    case 'image':
                                        dataArray = imgData;
                                        break;
                                }
    
                                if (event.shiftKey) { // Resize with Shift key
                                    const startWidth = startWidths.get(selectedBar);
                                    const newWidth = Math.max(10, startWidth + dx);
                                    
                                    // Update visual width immediately for responsiveness
                                    selectedBar.style.width = `${newWidth}px`;
    
                                    const startLeft = startPositions.get(selectedBar);
                                    // Snap to grid (10ms increments)
                                    const rawEndTime = (startLeft + newWidth) * 10 / scale;
                                    const newEndTime = Math.round(rawEndTime / gridSnap) * gridSnap;
    
                                    if (dataArray && dataArray[index]) {
                                        const newDuration = newEndTime - dataArray[index].delay;
                                        // Only update if value has changed
                                        if (dataArray[index].duration !== newDuration) {
                                            dataArray[index].duration = newDuration;
                                            const durationInput = document.querySelector(`.${type}-duration[data-slot="${index}"]`);
                                            if (durationInput) durationInput.value = newDuration;
                                            selectedBar.title = selectedBar.title.replace(/End: \d+ms/, `End: ${newEndTime}ms`);
                                        }
                                    }
                                } else { // Move
                                    const startLeft = startPositions.get(selectedBar);
                                    const newLeft = startLeft + dx;
                                    
                                    // Update visual position immediately for responsiveness
                                    selectedBar.style.left = `${newLeft}px`;
    
                                    // Snap to grid (10ms increments)
                                    const rawStartTime = newLeft * 10 / scale;
                                    const newStartTime = Math.round(rawStartTime / gridSnap) * gridSnap;
    
                                    if (dataArray && dataArray[index]) {
                                        // Add timeStart to delay for sound items
                                        const adjustedDelay = type === 'sound' ? 
                                            newStartTime + (dataArray[index].timeStart || 0) : 
                                            newStartTime;
                                        
                                        // Only update if value has changed
                                        if (dataArray[index].delay !== adjustedDelay) {
                                            dataArray[index].delay = adjustedDelay;
                                            const delayInput = document.querySelector(`.${type}-delay[data-slot="${index}"]`);
                                            if (delayInput) delayInput.value = adjustedDelay;
                                            selectedBar.title = selectedBar.title.replace(/Start: \d+ms/, `Start: ${newStartTime}ms`);
                                        }
                                    }
                                }
                            });
                        };
    
                        const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        }
    
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    });
    
                    const decreaseButton = bar.querySelector('.decrease-zindex');
                    const increaseButton = bar.querySelector('.increase-zindex');
                    const zIndexValue = bar.querySelector('.zindex-value');
    
                    if (decreaseButton && increaseButton && zIndexValue) {
                        const updateZIndex = (change) => {
                            const index = parseInt(bar.getAttribute('data-index'));
                            imgData[index].zIndex = Math.max(1, (imgData[index].zIndex || 1) + change);
                            zIndexValue.textContent = imgData[index].zIndex;
                            
                            const zIndexInput = document.querySelector(`.image-zindex[data-slot="${index}"]`);
                            if (zIndexInput) zIndexInput.value = imgData[index].zIndex;
                            
                            const imageItems = Array.from(html.find('.timeline-item-bar[data-type="image"]'));
                            imageItems.sort((a, b) => {
                                const aIndex = parseInt(a.getAttribute('data-index'));
                                const bIndex = parseInt(b.getAttribute('data-index'));
                                return imgData[bIndex].zIndex - imgData[aIndex].zIndex;
                            });
                            
                            const imageContainer = imageItems[0].parentElement.parentElement;
                            imageItems.forEach(item => {
                                imageContainer.appendChild(item.parentElement);
                            });
                        };
    
                        decreaseButton.addEventListener('click', () => updateZIndex(-1));
                        increaseButton.addEventListener('click', () => updateZIndex(1));
                    }
                });
    
                // Function to show context menu
                function showContextMenu(event, element) {
                    const menu = document.createElement('div');
                    menu.classList.add('context-menu');
                    menu.style.top = `${event.clientY}px`;
                    menu.style.left = `${event.clientX}px`;
    
                    const type = element.getAttribute('data-type');
                    const index = parseInt(element.getAttribute('data-index'));
    
                    // For sound type bars, show the clicked position
                    if (type === 'sound') {
                        const rect = element.getBoundingClientRect();
                        const clickX = event.clientX - rect.left;
                        const totalWidth = rect.width;
                        const clickedPosition = document.createElement('div');
                        clickedPosition.textContent = `Clicked at: ${Math.round(clickX * 10)}ms / ${Math.round(totalWidth * 10)}ms`;
                        menu.appendChild(clickedPosition);
    
                        const sound = soundData[index];
                        const hasStartTime = sound.timeStart !== undefined;
                        const hasEndTime = sound.timeEnd !== undefined;
                        const duration = sound.duration || 0; // Use 0 for sound-load determined duration
    
                        // Add Splice button
                        const spliceOption = document.createElement('div');
                        spliceOption.textContent = 'Splice';
                        spliceOption.addEventListener('click', () => {
                            spliceSoundAtPosition(element, clickX, totalWidth);
                            document.body.removeChild(menu);
                        });
                        menu.appendChild(spliceOption);
    
                        // Only show Start/Stop options based on whether both times are defined
                        if (hasStartTime && hasEndTime) {
                            // Both times defined - show Start Here and Stop Here
                            const startHereOption = document.createElement('div');
                            startHereOption.textContent = 'Start Here';
                            startHereOption.addEventListener('click', () => {
                                const newStartTime = Math.round(clickX * 10);
                                sound.timeStart = newStartTime;
                                // Update input box
                                const timeStartInput = document.querySelector(`.sound-timeStart[data-slot="${index}"]`);
                                if (timeStartInput) timeStartInput.value = newStartTime;
                                showAnimationTimeline();
                                document.body.removeChild(menu);
                            });
                            menu.appendChild(startHereOption);
    
                            const stopHereOption = document.createElement('div');
                            stopHereOption.textContent = 'Stop Here';
                            stopHereOption.addEventListener('click', () => {
                                const pixelsFromRight = totalWidth - clickX;
                                const newEndTime = Math.round(pixelsFromRight * 10);
                                sound.timeEnd = newEndTime;
                                // Update input box
                                const timeEndInput = document.querySelector(`.sound-timeEnd[data-slot="${index}"]`);
                                if (timeEndInput) timeEndInput.value = newEndTime;
                                showAnimationTimeline();
                                document.body.removeChild(menu);
                            });
                            menu.appendChild(stopHereOption);
                        } else {
                            // At least one time undefined - show both options
                            const startHereOption = document.createElement('div');
                            startHereOption.textContent = 'Start Here';
                            startHereOption.addEventListener('click', () => {
                                const newStartTime = Math.round(clickX * 10);
                                sound.timeStart = newStartTime;
                                // Update input box
                                const timeStartInput = document.querySelector(`.sound-timeStart[data-slot="${index}"]`);
                                if (timeStartInput) timeStartInput.value = newStartTime;
                                showAnimationTimeline();
                                document.body.removeChild(menu);
                            });
                            menu.appendChild(startHereOption);
    
                            const stopHereOption = document.createElement('div');
                            stopHereOption.textContent = 'Stop Here';
                            stopHereOption.addEventListener('click', () => {
                                const pixelsFromRight = totalWidth - clickX;
                                const newEndTime = Math.round(pixelsFromRight * 10);
                                sound.timeEnd = newEndTime;
                                // Update input box
                                const timeEndInput = document.querySelector(`.sound-timeEnd[data-slot="${index}"]`);
                                if (timeEndInput) timeEndInput.value = newEndTime;
                                showAnimationTimeline();
                                document.body.removeChild(menu);
                            });
                            menu.appendChild(stopHereOption);
                        }
                    }
    
                    if (type === 'text') {
                        const editOption = document.createElement('div');
                        editOption.textContent = 'Edit';
                        editOption.addEventListener('click', () => {
                            openEditDialog(element);
                            document.body.removeChild(menu);
                        });
                        menu.appendChild(editOption);
    
                        const duplicateOption = document.createElement('div');
                        duplicateOption.textContent = 'Duplicate';
                        duplicateOption.addEventListener('click', () => {
                            duplicateTextData(element);
                            document.body.removeChild(menu);
                        });
                        menu.appendChild(duplicateOption);
                    } else if (type === 'image' && imgData[index]?.file) {
                        const showOption = document.createElement('div');
                        showOption.textContent = 'Show';
                        showOption.addEventListener('click', () => {
                            const ip = new ImagePopout(imgData[index].file);
                            ip.render(true);
                            document.body.removeChild(menu);
                        });
                        menu.appendChild(showOption);
    
                        const changeOption = document.createElement('div');
                        changeOption.textContent = 'Change';
                        changeOption.addEventListener('click', async () => {
                            try {
                                const file = await filepickerPromise(imgData[index].file);
                                if (file) {
                                    // Update the image data with the new file
                                    imgData[index].file = file;
                                    // Update the display in the main dialog
                                    const fileDisplay = document.querySelector(`.image-file[data-slot="${index}"]`);
                                    if (fileDisplay) {
                                        fileDisplay.textContent = file;
                                    }
                                }
                            } catch (error) {
                                console.error("Error selecting file:", error);
                            }
                            document.body.removeChild(menu);
                        });
                        menu.appendChild(changeOption);
    
                        const duplicateOption = document.createElement('div');
                        duplicateOption.textContent = 'Duplicate';
                        duplicateOption.addEventListener('click', () => {
                            duplicateImageData(element);
                            document.body.removeChild(menu);
                        });
                        menu.appendChild(duplicateOption);
                    }
    
                    document.body.appendChild(menu);
    
                    document.addEventListener('click', () => {
                        if (document.body.contains(menu)) {
                            document.body.removeChild(menu);
                        }
                    }, { once: true });
                }
    
                // Function to splice sound at position
                function spliceSoundAtPosition(element, clickX, totalWidth) {
                    const index = parseInt(element.getAttribute('data-index'));
                    const soundItem = soundData[index];
                    if (!soundItem || !soundItem.file) return;
    
                    // Calculate the split point in milliseconds based on click position
                    const effectiveDuration = soundItem.duration || soundItem.actualDuration || 0;
                    if (effectiveDuration === 0) {
                        ui.notifications.error("Could not determine sound duration");
                        return;
                    }
                    
                    // Calculate split point relative to the total width
                    const splitPointPercentage = clickX / totalWidth;
                    const splitPoint = Math.round(effectiveDuration * splitPointPercentage);
    
                    // Find an empty slot for the new sound
                    const emptySlotIndex = soundData.findIndex(item => !item || !item.file);
                    if (emptySlotIndex === -1) {
                        ui.notifications.error("No available sound slots");
                        return;
                    }
    
                    const originalTimeEnd = effectiveDuration - splitPoint;
    
                    // Update the original sound to play first part (0 to effectiveDuration - splitPoint)
                    soundData[index] = {
                        ...soundItem,
                        timeEnd: originalTimeEnd,
                        timeStart: 0
                    };
    
                    // Create the new sound to play second part (starting from where original ends)
                    soundData[emptySlotIndex] = {
                        ...soundItem,
                        delay: (soundItem.delay || 0) + originalTimeEnd,
                        timeStart: effectiveDuration - originalTimeEnd
                    };
    
                    // Update UI for both sounds
                    const originalDelayInput = document.querySelector(`.sound-delay[data-slot="${index}"]`);
                    const originalDurationInput = document.querySelector(`.sound-duration[data-slot="${index}"]`);
                    const originalTimeStartInput = document.querySelector(`.sound-timeStart[data-slot="${index}"]`);
                    const originalTimeEndInput = document.querySelector(`.sound-timeEnd[data-slot="${index}"]`);
                    if (originalDelayInput) originalDelayInput.value = soundItem.delay || 0;
                    if (originalDurationInput) originalDurationInput.value = effectiveDuration;
                    if (originalTimeStartInput) originalTimeStartInput.value = soundData[index].timeStart;
                    if (originalTimeEndInput) originalTimeEndInput.value = soundData[index].timeEnd;
    
                    const newDelayInput = document.querySelector(`.sound-delay[data-slot="${emptySlotIndex}"]`);
                    const newDurationInput = document.querySelector(`.sound-duration[data-slot="${emptySlotIndex}"]`);
                    const newTimeStartInput = document.querySelector(`.sound-timeStart[data-slot="${emptySlotIndex}"]`);
                    const newTimeEndInput = document.querySelector(`.sound-timeEnd[data-slot="${emptySlotIndex}"]`);
                    if (newDelayInput) newDelayInput.value = soundData[emptySlotIndex].delay || 0;
                    if (newDurationInput) newDurationInput.value = effectiveDuration;
                    if (newTimeStartInput) newTimeStartInput.value = soundData[emptySlotIndex].timeStart;
                    if (newTimeEndInput) newTimeEndInput.value = soundData[emptySlotIndex].timeEnd || effectiveDuration;
    
                    // Update file display and show controls for the new sound
                    const fileDisplay = document.querySelector(`.sound-file-display[data-slot="${emptySlotIndex}"]`);
                    if (fileDisplay) {
                        fileDisplay.textContent = soundItem.file;
                    }
                    const clearButton = document.querySelector(`.clear-sounds[data-slot="${emptySlotIndex}"]`);
                    if (clearButton) {
                        clearButton.style.display = 'block';
                    }
    
                    // Reopen the timeline dialog to reflect changes
                    if (typeof app !== 'undefined' && typeof app.close === 'function') {
                        app.close();
                    }
                    setTimeout(() => {
                        showAnimationTimeline();
                    }, 100);
                }
    
                // Function to handle file picking
                async function filepickerPromise(path) {
                    return new Promise((resolve, reject) => {
                        const fp = new FilePicker({
                            current: path,
                            type: "file",
                            callback: async (file) => {
                                resolve(file); // Resolve with the selected file
                            },
                            close: () => console.log("File picker closed")
                        });
                        fp.render(true);
                    });
                }
    
                // Function to duplicate text data
                function duplicateTextData(element) {
                    const index = parseInt(element.getAttribute('data-index'));
                    const textData = window.textData[index];
                    const emptySlotIndex = window.textData.findIndex(data => !data.text);
                    if (emptySlotIndex !== -1) {
                        // Duplicate the text data
                        window.textData[emptySlotIndex] = { ...textData, delay: textData.delay + textData.duration };
                        const textInput = document.querySelector(`.text-input[data-slot="${emptySlotIndex}"]`);
                        if (textInput) {
                            textInput.value = textData.text;
                        }
    
                        // Update checkboxes and other inputs
                        const onTokenCheckbox = document.querySelector(`.text-on-token[data-slot="${emptySlotIndex}"]`);
                        if (onTokenCheckbox) {
                            onTokenCheckbox.checked = textData.onToken;
                        }
                        const attachCheckbox = document.querySelector(`.text-attach[data-slot="${emptySlotIndex}"]`);
                        if (attachCheckbox) {
                            attachCheckbox.checked = textData.attach;
                        }
                        const persistCheckbox = document.querySelector(`.text-persist[data-slot="${emptySlotIndex}"]`);
                        if (persistCheckbox) {
                            persistCheckbox.checked = textData.persist;
                        }
    
                        // Update position and timing inputs
                        const xInput = document.querySelector(`.text-x[data-slot="${emptySlotIndex}"]`);
                        if (xInput) {
                            xInput.value = textData.x;
                        }
                        const yInput = document.querySelector(`.text-y[data-slot="${emptySlotIndex}"]`);
                        if (yInput) {
                            yInput.value = textData.y;
                        }
                        const durationInput = document.querySelector(`.text-duration[data-slot="${emptySlotIndex}"]`);
                        if (durationInput) {
                            durationInput.value = textData.duration;
                        }
                        const delayInput = document.querySelector(`.text-delay[data-slot="${emptySlotIndex}"]`);
                        if (delayInput) {
                            delayInput.value = textData.delay;
                        }
    
                        // Close and reopen the dialog using app.close()
                        if (typeof app !== 'undefined' && typeof app.close === 'function') {
                            app.close();
                        }
    
                        // Reopen the dialog after a short delay
                        setTimeout(() => {
                            showAnimationTimeline();
                        }, 100);
                    }
                }
    
                // Function to duplicate image data
                function duplicateImageData(element) {
                    const index = parseInt(element.getAttribute('data-index'));
                    const imageData = imgData[index];
                    const emptySlotIndex = imgData.findIndex(data => !data?.file);
                    if (emptySlotIndex !== -1) {
                        // Calculate new delay
                        const newDelay = imageData.delay + imageData.duration;
                        
                        // Duplicate the image data with new delay
                        imgData[emptySlotIndex] = { ...imageData, delay: newDelay };
                        
                        // Update file display
                        const fileDisplay = document.querySelector(`.image-file[data-slot="${emptySlotIndex}"]`);
                        if (fileDisplay) {
                            fileDisplay.textContent = imageData.file;
                        }
    
                        // Show control buttons
                        document.querySelector(`.clear-image[data-slot="${emptySlotIndex}"]`).style.display = 'block';
                        document.querySelector(`.configure-fx[data-slot="${emptySlotIndex}"]`).style.display = 'block';
                        document.querySelector(`.configure-animation[data-slot="${emptySlotIndex}"]`).style.display = 'block';
                        document.querySelector(`.preview-image[data-slot="${emptySlotIndex}"]`).style.display = 'block';
                        document.querySelector(`.image-controls[data-slot="${emptySlotIndex}"]`).style.display = 'block';
                        document.querySelector(`.imgontoken[data-slot="${emptySlotIndex}"]`).style.display = 'flex';
    
                        // Show token controls and append options container if "on token" is true
                        if (imageData.onToken) {
                            const tokenControls = document.querySelector(`.token-image-controls[data-slot="${emptySlotIndex}"]`);
                            tokenControls.style.display = 'block';
    
                            // Create and append token options container
                            const checkboxContainer = document.createElement('div');
                            checkboxContainer.className = 'token-options-container';
                            checkboxContainer.style.cssText = `
                                background: lightgray;
                                color: black;
                                padding: 5px;
                                border-radius: 3px;
                                margin-top: 3px;
                            `;
    
                            checkboxContainer.innerHTML = `
                                <div style="margin-top: 10px;">
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <input type="checkbox" class="image-persist" data-slot="${emptySlotIndex}">
                                        <label>Persist?</label>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                                        <input type="checkbox" class="image-attach-source" data-slot="${emptySlotIndex}">
                                        <label>Attach to Source Token?</label>
                                        <button class="attach-options-btnimage" data-slot="${emptySlotIndex}" style="margin-left: 5px;background: rgb(74, 100, 132) !important; color: white !important; border: none !important; border-radius: 3px !important; cursor: pointer !important;">Attach Options</button>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 5px;">
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <input type="checkbox" class="image-stretch-target" data-slot="${emptySlotIndex}">
                                            <label>Stretch to Target?</label>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 5px; margin-left: 20px;">
                                            <input type="checkbox" class="image-stretch-target-tiling" data-slot="${emptySlotIndex}">
                                            <label>Tiling</label>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                                        <input type="checkbox" class="image-below-token" data-slot="${emptySlotIndex}">
                                        <label>Image Below Token?</label>
                                    </div>
                                </div>
                            `;
    
                            tokenControls.appendChild(checkboxContainer);
                        } else {
                            document.querySelector(`.token-image-controls[data-slot="${emptySlotIndex}"]`).style.display = 'none';
                        }
    
                        // Update all inputs
                        const inputs = {
                            'image-x': imageData.x,
                            'image-y': imageData.y,
                            'image-scale': imageData.scale,
                            'image-opacity': imageData.opacity,
                            'image-duration': imageData.duration,
                            'image-delay': newDelay,
                            'image-zindex': imageData.zIndex,
                            'image-fadeInDuration': imageData.fadeInDuration,
                            'image-fadeOutDuration': imageData.fadeOutDuration,
                            'image-size-width': imageData.size?.width,
                            'image-size-height': imageData.size?.height
                        };
    
                        // Update checkboxes
                        const checkboxes = {
                            'image-mirror-x': imageData.mirrorX,
                            'image-mirror-y': imageData.mirrorY,
                            'image-on-token': imageData.onToken,
                            'image-persist': imageData.persist || false,
                            'image-attach-source': imageData.attachToSource || false,
                            'image-stretch-target': imageData.stretchToTarget || false,
                            'image-stretch-target-tiling': imageData.stretchTargetTiling || false,
                            'image-below-token': imageData.belowToken || false
                        };
    
                        // Set input values
                        Object.entries(inputs).forEach(([className, value]) => {
                            const input = document.querySelector(`.${className}[data-slot="${emptySlotIndex}"]`);
                            if (input && value !== null && value !== undefined) {
                                input.value = value;
                            }
                        });
    
                        // Set checkbox states
                        Object.entries(checkboxes).forEach(([className, value]) => {
                            const checkbox = document.querySelector(`.${className}[data-slot="${emptySlotIndex}"]`);
                            if (checkbox) {
                                checkbox.checked = value;
                            }
                        });
    
                        // Close and reopen the dialog to refresh the timeline
                        if (typeof app !== 'undefined' && typeof app.close === 'function') {
                            app.close();
                        }
    
                        // Reopen the dialog after a short delay
                        setTimeout(() => {
                            showAnimationTimeline();
                        }, 300);
                    }
                }
    
                // Function to open a Foundry dialog with a textarea
                function openEditDialog(element) {
                    const currentText = element.textContent.trim(); 
                    new Dialog({
                        title: 'Edit Text',
                        content: `<textarea id='edit-textarea' style='width:100%; height:200px;'>${currentText}</textarea>`,
                        buttons: {
                            save: {
                                label: 'Save',
                                callback: () => {
                                    const newText = document.getElementById('edit-textarea').value;
                                    updateRelatedSlots(newText, parseInt(element.getAttribute('data-index')));
                                }
                            },
                            cancel: {
                                label: 'Cancel'
                            }
                        }
                    }).render(true);
                }
    
                // Function to update related slots
                function updateRelatedSlots(newText, slotIndex) {
                    // Update window.textData directly
                    if (slotIndex >= 0 && slotIndex < window.textData.length) {
                        window.textData[slotIndex].text = newText;
                    }
                    
                    // Update the related textarea using jQuery
                    const textInput = $(`.text-input[data-slot="${slotIndex}"]`);
                    if (textInput.length) {
                        textInput.val(newText);
                    }
    
                    // Update UI elements
                    const bar = document.querySelector(`.timeline-item-bar[data-type="text"][data-index="${slotIndex}"]`);
                    if (bar) {
                        bar.textContent = newText;
                    }
                }
    
                // Enable multi-selection of bars
                function enableMultiSelection() {
                    const timelineContainer = document.querySelector('.timeline-container');
                    timelineContainer.addEventListener('mousedown', (event) => {
                        const bars = timelineContainer.querySelectorAll('.timeline-item-bar');
                        if (!event.target.classList.contains('timeline-item-bar')) {
                            bars.forEach(bar => bar.classList.remove('selected'));
                            // Logic to start selection
                        }
                    });
    
                    // Use event delegation to handle newly added bars
                    timelineContainer.addEventListener('click', (event) => {
                        if (event.target.classList.contains('timeline-item-bar')) {
                            event.target.classList.toggle('selected');
                        }
                    });
                }
    
                enableMultiSelection();
    
                timelineContainer.addEventListener('wheel', (event) => {
                    event.preventDefault();
                    const oldScale = scale;
                    scale = Math.min(Math.max(0.5, scale - event.deltaY * 0.001), 3);
    
                    // Get the mouse position relative to the timeline container
                    const rect = timelineContainer.getBoundingClientRect();
                    //const mouseX = event.clientX - rect.left + timelineContainer.scrollLeft;
                    const mouseX = event.clientX - rect.left;
                    const slot = Math.floor(mouseX / (scale * 100)); // Adjust based on your timeline scale
    
                    // Update all timeline items
                    const allBars = html.find('.timeline-item-bar');
                    allBars.each((_, bar) => {
                        const type = bar.getAttribute('data-type');
                        const index = parseInt(bar.getAttribute('data-index'));
                        let item;
                        
                        // Find the corresponding item data
                        switch(type) {
                            case 'text':
                                item = window.textData[index];
                                break;
                            case 'sound':
                                item = soundData[index];
                                break;
                            case 'image':
                                item = imgData[index];
                                break;
                        }
    
                        if (item) {
                            const startTime = item.delay;
                            let duration;
                            if (type === 'sound') {
                                // Use the stored duration which will be either:
                                // - The user-specified duration if set
                                // - The actual file duration if no duration was specified
                                const itemData = timelineItems.sound.find(i => i.index === index);
                                duration = itemData?.duration || 3000;
                            } else {
                                duration = item.duration || 3000;
                            }
                            const endTime = startTime + duration;
    
                            // Calculate new position and width
                            const newLeft = (startTime / 10) * scale;
                            const newWidth = ((endTime - startTime) / 10) * scale;
    
                            bar.style.left = `${newLeft}px`;
                            bar.style.width = `${newWidth}px`;
                        }
                    });
    
                    // Update timeline markers and labels positions
                    const timeMarkers = html.find('.time-marker');
                    const timeLabels = html.find('.time-label');
                    
                    timeMarkers.each((i, marker) => {
                        marker.style.left = `${i * 100 * scale}px`;
                    });
                    
                    timeLabels.each((i, label) => {
                        label.style.left = `${i * 100 * scale}px`;
                    });
    
                    // Adjust scroll position to keep the mouse point fixed
                    const scaleFactor = scale / oldScale;
                    const newScrollLeft = mouseX * scaleFactor - (event.clientX - rect.left);
                    timelineContainer.scrollLeft = newScrollLeft;
                });
    
                // Add CSS for the context menu
                const style = document.createElement('style');
                style.textContent = `
                    .context-menu {
                        position: absolute;
                        background-color: white;
                        border: 1px solid #ccc;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                        z-index: 1000;
                        width: 150px;
                    }
                    .context-menu div {
                        padding: 8px 12px;
                        cursor: pointer;
                    }
                    .context-menu div:hover {
                        background-color: #f0f0f0;
                    }
                `;
                document.head.appendChild(style);
            }
        }, {id: "timeline-dialog"}).render(true);
    }
    // Function to preview a single text animation
    function previewSingleText(slot) {
        ensureTextDataIntegrity();
        const text = window.textData[slot];
        
        if (!text || !text.text.trim()) {
            ui.notifications.warn("No text entered for this slot");
            return;
        }

        console.log("Previewing text:", text);

        let sequence = new Sequence();
        sequence = sequence.effect()
            .text(text.text, text.style)
            .rotate(text.style.rotate || 0);
        if (text.onToken) {
            const source = canvas.tokens.controlled[0];
            if (!source) {
                ui.notifications.warn("No token selected");
                return;
            }
            
            if (text.attach) {
                sequence = sequence.attachTo(canvas.tokens.controlled[0], text.attachOptions);
            } else {
                sequence = sequence.atLocation(canvas.tokens.controlled[0], { cacheLocation: true });
            }
        } else {
            sequence = sequence
                .atLocation({ x: 0, y: 0 })
                .screenSpaceAboveUI()
                .screenSpaceAnchor(0.5)
                .screenSpacePosition({ x: text.x, y: text.y });
        }

        sequence = sequence
            .duration(text.duration)
            .fadeIn(Number(text.style.fadeInDuration) || 500)
            .fadeOut(Number(text.style.fadeOutDuration) || 500)
            .zIndex(50)
            .animateProperty("sprite", "position.x", {
                from: text.x,
                to: text.x + text.style.moveXBy,
                duration: text.style.movementDuration,
                ease: text.movementEase,
                delay: 0,
                relative: false
            })
            .animateProperty("sprite", "position.y", {
                from: text.y,
                to: text.y + text.style.moveYBy,
                duration: text.style.movementDuration,
                ease: text.movementEase,
                delay: 0,
                relative: false
            })
            .animateProperty("sprite", "scale.x", {
                from: 1,
                to: text.style.scaleXTo || 1,
                duration: text.style.scaleDuration || 1000,
                ease: text.style.scaleEase,
                delay: 0
            })
            .animateProperty("sprite", "scale.y", {
                from: 1,
                to: text.style.scaleYTo || 1,
                duration: text.style.scaleDuration || 1000,
                ease: text.style.scaleEase,
                delay: 0
            });

        // Check if persist is enabled for this slot
        const isPersist = $(`.text-persist[data-slot="${slot}"]`).prop('checked');
        if (isPersist) {
            sequence = sequence.persist();
        }

        sequence.play();
    }

    // Function to preview a single sound effect
    // Function to preview a single sound effect
    function previewSingleSound(slot) {
        ensuresoundDataIntegrity();
        const sound = soundData[slot];
        
        if (!sound || !sound.file) {
            ui.notifications.warn("No sound file selected for this slot");
            return;
        }

        console.log("Previewing sound:", sound);

        const sequence = new Sequence()
            .sound()
            .file(sound.file)
            .name(`soundEffect${slot}`)
            .fadeInAudio(sound.fadeIn)
            .fadeOutAudio(sound.fadeOut)
            .volume(sound.volume);

        if (sound.duration !== 0) {
            sequence.duration(sound.duration);
        }
        
        if (sound.timeStart !== 0 || sound.timeEnd !== 0) {
            // Skip ahead by timeStart milliseconds
            if (sound.timeStart !== 0) {
                sequence.startTime(sound.timeStart);
            }
            
            // Skip the last timeEnd milliseconds
            // If there's a startTime, we need to add it to endTime
            if (sound.timeEnd !== 0) {
                sequence.endTime(sound.timeEnd + (sound.timeStart || 0));
            }
        }
        sequence.play({ preload: true });
    }
    // Add event handlers for preview buttons
    $(document).off("click", ".preview-image").on("click", ".preview-image", function() {
        const slot = $(this).data("slot");
        previewSingleImage(slot);
    });

    $(document).off("click", ".preview-text").on("click", ".preview-text", function() {
        const slot = $(this).data("slot");
        previewSingleText(slot);
    });

    $(document).off("click", ".preview-sound").on("click", ".preview-sound", function() {
        const slot = $(this).data("slot");
        previewSingleSound(slot);
    });

    // Handle timeline button click
    $(document).off("click", "#timeline-button").on("click", "#timeline-button", function() {
        showAnimationTimeline();
    });

    // Handle copy style button clicks
    $(document).off("click", ".copy-style").on("click", ".copy-style", function() {
        const slot = $(this).data("slot");
        ensureTextDataIntegrity();
        
        // Copy only the style properties, not text content or position/timing
        copiedTextStyle = { ...window.textData[slot].style };
        ui.notifications.info("Style copied!");
    });

    $(document).off("click", ".image-target").on("click", ".image-target", function() {
        const slot = $(this).data("slot");
        window.activeImageTargetSlot = slot; // Store the active slot globally
        
        // Define the click handler function
        const clickHandler = (event) => {
            // Remove the overlay when clicking
            $('#clickOverlay').remove();
            document.body.style.cursor = 'default';
    
            // Only process left clicks
            if (event.button !== 0) return;
            
            // Calculate window center point
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Calculate distance from center (negative values mean left/up from center)
            const relativeX = Math.round((event.clientX - centerX));
            const relativeY = Math.round((event.clientY - centerY)); // Changed to match coordinate system
            
            // Update the image coordinates for the active slot
            if (window.activeImageTargetSlot !== undefined) {
                const img = imgData[slot];
                
                // Set the coordinates directly without scaling
                img.x = relativeX;
                img.y = relativeY;
                img.trueInitialX = relativeX;
                img.trueInitialY = relativeY;
                
                // Update the input values
                const xInput = $(`.image-x[data-slot="${window.activeImageTargetSlot}"]`);
                const yInput = $(`.image-y[data-slot="${window.activeImageTargetSlot}"]`);
                
                xInput.val(relativeX);
                yInput.val(relativeY);
                
                // Trigger change events
                xInput.trigger('change');
                yInput.trigger('change');
                previewSingleImage(slot);
                
                // Remove the click handler after updating
                document.removeEventListener('click', clickHandler);
                ui.notifications?.info('Image position updated!');
                window.activeImageTargetSlot = undefined; // Clear the active slot
                return;
            }
            
            // Get basic click information
            const clickInfo = {
                // Window dimensions
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                windowCenterX: centerX,
                windowCenterY: centerY,
                
                // Click coordinates (browser)
                clientX: event.clientX,
                clientY: event.clientY,
                
                // Click coordinates (relative to center)
                relativeX: relativeX,
                relativeY: relativeY,
                
                // Target information
                target: event.target?.tagName || 'unknown',
                targetId: event.target?.id || 'no-id',
                targetClasses: Array.from(event.target?.classList || []),
                button: event.button,
                timestamp: Date.now()
            };
            
            // Get canvas-specific information if clicking on the canvas
            if (canvas?.ready) {
                try {
                    // Get mouse position
                    if (canvas.mousePosition) {
                        clickInfo.canvasX = canvas.mousePosition.x;
                        clickInfo.canvasY = canvas.mousePosition.y;
                    }
                    
                    // Get grid position if available
                    if (canvas.grid) {
                        const point = new PIXI.Point(
                            canvas.mousePosition?.x || 0,
                            canvas.mousePosition?.y || 0
                        );
                        const snappedPoint = canvas.grid.getSnappedPoint(point.x, point.y);
                        if (snappedPoint) {
                            clickInfo.gridX = snappedPoint.x;
                            clickInfo.gridY = snappedPoint.y;
                        }
                    }
                    
                    // Get scene coordinates
                    if (canvas.stage) {
                        const worldPos = canvas.app.renderer.events.pointer.getLocalPosition(canvas.stage);
                        clickInfo.sceneX = worldPos.x;
                        clickInfo.sceneY = worldPos.y;
                    }
                    
                    // Get active scene info
                    if (canvas.scene) {
                        clickInfo.sceneName = canvas.scene.name;
                        clickInfo.sceneId = canvas.scene.id;
                    }
                } catch (error) {
                    console.warn('Error getting canvas information:', error);
                }
            }
            
            // Log the relative position in a clear format
            console.log(`Click position relative to center: X ${relativeX >= 0 ? '+' : ''}${relativeX}, Y ${relativeY >= 0 ? '+' : ''}${relativeY}`);
            console.log('Full Click Information:', clickInfo);
            
            // Remove the click handler after logging
            document.removeEventListener('click', clickHandler);
            ui.notifications?.info('Click logger deactivated after capturing click data.');
        };
    
        // Remove any existing click handler
        document.removeEventListener('click', clickHandler);
        
        // Create an overlay to indicate click mode is active
        const overlay = $('<div id="clickOverlay">Click anywhere to set image position</div>').css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.3)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            zIndex: 9999,
            backdropFilter: 'blur(3px)',
            cursor: 'crosshair',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease'
        }).appendTo('body');
    
        // Change cursor style
        document.body.style.cursor = 'crosshair';
        
        // Add the new click handler
        document.addEventListener('click', clickHandler);
        
        ui.notifications?.info('Click anywhere on the screen to set image position');
    });
    
    async function previewSingleImage(slot) {
        ensureimgDataIntegrity();
        const img = imgData[slot];
        
        if (!img.file) {
            ui.notifications.warn("No image selected for this slot");
            return;
        }
    
        console.log("Previewing image:", img);
    
        // Create a new sequence for preview
        let sequence = new Sequence();
    
        // Add image
        sequence = sequence.effect()
            .file(img.file);
    
        if (img.onToken) {
            const source = canvas.tokens.controlled[0];
            const target = game.user.targets.first();
    
            if (!source) {
                ui.notifications.warn("Please select a token to preview the effect");
                return;
            }
            sequence = sequence
                .atLocation(source, { cacheLocation: true });
        } else {
            // Set the initial position
            sequence = sequence
                .atLocation({ x: 0, y: 0 })
                .screenSpaceAboveUI()
                .screenSpaceAnchor(0.5)
                .screenSpacePosition({ x: img.x, y: img.y });
        }
    
        sequence = sequence
            .scale(img.scale)
            .opacity(img.opacity);
    
        // Apply size if specified
        if (img.size && (img.size.width !== null || img.size.height !== null)) {
            const size = {
                width: img.size.width !== null ? img.size.width : undefined,
                height: img.size.height !== null ? img.size.height : undefined
            };
            sequence = sequence.size(size, { gridUnits: img.size.gridUnits });
        }
    
        sequence = sequence
            .fadeIn(img.fadeInDuration)
            .fadeOut(img.fadeOutDuration)
            .duration(img.duration)
            // do not include .delay(img.delay)
            .zIndex(img.zIndex)
            .mirrorX(img.mirrorX)
            .mirrorY(img.mirrorY);
    
        // Position animation
        if (img.animations.position?.length > 0) {
            let currentX = 0;  // Start from 0 since we'll use relative positions
            let currentY = 0;
        
            for (const posAnim of img.animations.position) {
                if (!posAnim || posAnim.enabled === false) continue;
                
                // Skip animation if there's no actual movement
                if (posAnim.moveToX === 0 && posAnim.moveToY === 0) continue;
                
                const toX = currentX + posAnim.moveToX;
                const toY = currentY + posAnim.moveToY;
                
                sequence = sequence.animateProperty("spriteContainer", "position.x", {
                    from: currentX,
                    to: toX,
                    duration: Number(posAnim.duration || 1000),
                    ease: posAnim.ease || "linear",
                    delay: Number(posAnim.delay || 0),
                    gridUnits: Boolean(posAnim.gridUnits),
                    fromEnd: Boolean(posAnim.fromEndX),
                    relative: true,  // Make it relative to the initial position
                    absolute: true
                })
                .animateProperty("spriteContainer", "position.y", {
                    from: currentY,
                    to: toY,
                    duration: Number(posAnim.duration || 1000),
                    ease: posAnim.ease || "linear",
                    delay: Number(posAnim.delay || 0),
                    gridUnits: Boolean(posAnim.gridUnits),
                    fromEnd: Boolean(posAnim.fromEndY),
                    relative: true,  // Make it relative to the initial position
                    absolute: true
                });
                
                // Update positions for next animation in sequence
                currentX = toX;
                currentY = toY;
            }
        }
    
        // Rotation animation
        if (img.animations.rotation?.length > 0) {
            for (const rotAnim of img.animations.rotation) {
                if (!rotAnim || rotAnim.enabled === false) continue;
                const animProps = {
                    from: rotAnim.from,
                    to: rotAnim.to,
                    duration: rotAnim.duration,
                    ease: rotAnim.ease,
                    delay: rotAnim.delay,
                    fromEnd: rotAnim.fromEnd
                };
                
                if (rotAnim.loop) {
                    sequence = sequence.loopProperty("sprite", "rotation", animProps);
                } else {
                    sequence = sequence.animateProperty("sprite", "rotation", animProps);
                }
            }
        }
    
        // Scale animation
        if (img.animations.scale?.length > 0) {
            for (const scaleAnim of img.animations.scale) {
                if (!scaleAnim || scaleAnim.enabled === false) continue;
                sequence = sequence.animateProperty("sprite", "scale.x", {
                    from: scaleAnim.fromX,
                    to: scaleAnim.toX,
                    duration: scaleAnim.duration,
                    ease: scaleAnim.ease,
                    delay: scaleAnim.delay,
                    fromEnd: scaleAnim.fromEnd
                })
                .animateProperty("sprite", "scale.y", {
                    from: scaleAnim.fromY,
                    to: scaleAnim.toY,
                    duration: scaleAnim.duration,
                    ease: scaleAnim.ease,
                    delay: scaleAnim.delay,
                    fromEnd: scaleAnim.fromEnd
                });
            }
        }
    
        // Alpha animation
        if (img.animations.alpha?.length > 0) {
            for (const alphaAnim of img.animations.alpha) {
                if (!alphaAnim || alphaAnim.enabled === false) continue;
                sequence = sequence.animateProperty("sprite", "alpha", {
                    from: alphaAnim.from,
                    to: alphaAnim.to,
                    duration: alphaAnim.duration,
                    ease: alphaAnim.ease,
                    delay: alphaAnim.delay,
                    fromEnd: alphaAnim.fromEnd
                });
            }
        }
    
        if (img.filters.blur.enabled && !(img.animations.blur?.length > 0)) {
            sequence = sequence.filter("Blur", {
                strength: img.filters.blur.strength,
                blur: img.filters.blur.blur,
                blurX: img.filters.blur.blurX,
                blurY: img.filters.blur.blurY,
                quality: img.filters.blur.quality,
                resolution: img.filters.blur.resolution,
                kernelSize: img.filters.blur.kernelSize
            }, "blurEffect");
        }
        if (img.animations.blur?.length > 0) {
            sequence = sequence.filter("Blur", { strength: 0.1, blurX: 0.1, blurY: 0.1, quality: 1 }, "blurEffect");
            for (const blurAnim of img.animations.blur) {
                if (!blurAnim || blurAnim.enabled === false) continue;
                sequence = sequence.animateProperty("effectFilters.blurEffect", "strength", {
                    from: blurAnim.fromStrength,
                    to: blurAnim.toStrength,
                    duration: blurAnim.duration,
                    ease: blurAnim.ease,
                    delay: blurAnim.delay
                })
                .animateProperty("effectFilters.blurEffect", "blurX", {
                    from: blurAnim.fromBlurX,
                    to: blurAnim.toBlurX,
                    duration: blurAnim.duration,
                    ease: blurAnim.ease,
                    delay: blurAnim.delay
                })
                .animateProperty("effectFilters.blurEffect", "blurY", {
                    from: blurAnim.fromBlurY,
                    to: blurAnim.toBlurY,
                    duration: blurAnim.duration,
                    ease: blurAnim.ease,
                    delay: blurAnim.delay
                });
            }
        }
    
        // Apply persist, attachToSource, and stretchToTarget
        if (img.onToken) {
            const source = canvas.tokens.controlled[0];
            const target = game.user.targets.first();
    
            if (img.attachToSource) {
                sequence = sequence.attachTo(source, img.attachOptions);
            }
    
            if (img.stretchToTarget && target) {
                sequence = sequence.stretchTo(target, { attachTo: true, tiling: img.stretchToTarget.tiling });
            }
            if (img.belowToken) {
                sequence = sequence.belowTokens();
            }
    
            if (img.persist) {
                sequence = sequence.persist();
            }
        }
    
        await sequence.play({ preload: true });
    }
    
    $(document).off("click", "#show").on("click", "#show", async () => {
        ensureTextDataIntegrity();
        ensureimgDataIntegrity();
        ensuresoundDataIntegrity();
        
        // Check if at least one text or image is configured
        const hasContent = window.textData.some(t => t.text.trim()) || imgData.some(img => img.file);
        
        if (!hasContent) {
            ui.notifications.warn("Please add at least one text or image for the animation.");
            return;
        }
    
        const rectStyle = {
            fillColor: $("#rectFillColor").val() || '#000000',
            fillAlpha: parseFloat($("#rectFillAlpha").val()) || 0,
            width: 300,
            height: 300,
            anchor: { x: 0, y: 0 },
            lineSize: 0
        };
    //
        let sequence = new Sequence();
    
        // Add rectangle background
        sequence = sequence.effect()
            .shape("rectangle", rectStyle)
            .screenSpace()
            .screenSpaceAboveUI()
            .screenSpaceAnchor(0.0)
            .screenSpaceScale({fitX: true, fitY: true})  
            .screenSpacePosition({ x: 0, y: 0 })
            .duration(parseInt($("#durationValue").val()) || 3000)
            .fadeIn(500)
            .fadeOut(500);
    
        // Sort images and texts by z-index
        const elements = [];
        
        // Add images to elements array
        for (const img of imgData) {
            if (img && img.file) {
                elements.push({
                    type: 'image',
                    index: imgData.indexOf(img),
                    startTime: img.delay,
                    endTime: img.delay + img.duration,
                    content: img.file.split('/').pop()
                });
            }
        }
    
        // Add texts to elements array
        for (const text of textData) {
            if (text && text.text.trim()) {
                elements.push({
                    type: 'text',
                    index: textData.indexOf(text),
                    startTime: text.delay,
                    endTime: text.delay + text.duration,
                    content: text.text.substring(0, 20) + (text.text.length > 20 ? '...' : '')
                });
            }
        }
    
        // Add sound effects to elements array
        for (const sound of soundData) {
            if (sound && sound.file) {
                elements.push({
                    type: 'sound',
                    index: soundData.indexOf(sound),
                    startTime: sound.delay,
                    content: sound.file.split('/').pop(),
                    duration: sound.duration,
                    fadeIn: sound.fadeIn,
                    fadeOut: sound.fadeOut,
                    timeStart: sound.timeStart,
                    timeEnd: sound.timeEnd,
                    volume: sound.volume
                });
            }
        }
    
        // Sort elements by start time
        elements.sort((a, b) => a.startTime - b.startTime);
    
        // Add elements to sequence in start time order
        for (const element of elements) {
            if (element.type === 'image') {
                const img = imgData[element.index];
                let location;
                if (img.onToken) {
                    const source = canvas.tokens.controlled[0];
                    const target = game.user.targets.first();
    
                    if (!source) {
                        ui.notifications.warn("Please select a token to preview the effect");
                        return;
                    }
                    location = source;
                } else {
                    location = { x: 0, y: 0 };
                }
                sequence = sequence
                    .effect()
                    .file(img.file)
                    .atLocation(location)
                    .screenSpaceAboveUI(img.onToken ? false : true)
                    .screenSpaceAnchor(0.5)
                    .screenSpacePosition(img.onToken ? { x: 0, y: 0 } : { x: img.x, y: img.y })
                    .scale(img.scale)
                    .opacity(img.opacity);
    
                // Apply size if specified
                if (img.size && (img.size.width !== null || img.size.height !== null)) {
                    const size = {
                        width: img.size.width !== null ? img.size.width : undefined,
                        height: img.size.height !== null ? img.size.height : undefined
                    };
                    sequence = sequence.size(size, { gridUnits: img.size.gridUnits });
                }
    
                sequence = sequence
                    .fadeIn(img.fadeInDuration)
                    .fadeOut(img.fadeOutDuration)
                    .duration(img.duration)
                    .delay(img.delay)
                    .zIndex(img.zIndex)
                    .mirrorX(img.mirrorX)
                    .mirrorY(img.mirrorY);
    
                // Position animation
                if (img.animations.position?.length > 0) {
                    let currentX = 0;  // Start from 0 since we'll use relative positions
                    let currentY = 0;
        
                    for (const posAnim of img.animations.position) {
                        if (!posAnim || posAnim.enabled === false) continue;
                        
                        // Skip animation if there's no actual movement
                        if (posAnim.moveToX === 0 && posAnim.moveToY === 0) continue;
                        
                        const toX = currentX + posAnim.moveToX;
                        const toY = currentY + posAnim.moveToY;
                        
                        sequence = sequence.animateProperty("spriteContainer", "position.x", {
                            from: currentX,
                            to: toX,
                            duration: Number(posAnim.duration || 1000),
                            ease: posAnim.ease || "linear",
                            delay: Number(posAnim.delay || 0),
                            gridUnits: Boolean(posAnim.gridUnits),
                            fromEnd: Boolean(posAnim.fromEndX),
                            relative: true,  // Make it relative to the initial position
                            absolute: true
                        })
                        .animateProperty("spriteContainer", "position.y", {
                            from: currentY,
                            to: toY,
                            duration: Number(posAnim.duration || 1000),
                            ease: posAnim.ease || "linear",
                            delay: Number(posAnim.delay || 0),
                            gridUnits: Boolean(posAnim.gridUnits),
                            fromEnd: Boolean(posAnim.fromEndY),
                            relative: true,  // Make it relative to the initial position
                            absolute: true
                        });
                        
                        // Update positions for next animation in sequence
                        currentX = toX;
                        currentY = toY;
                    }
                } else {
                    // If no position animation, use current position
                    sequence = sequence
                        .atLocation({ x: 0, y: 0 })
                        .screenSpaceAboveUI()
                        .screenSpaceAnchor(0.5)
                        .screenSpacePosition({ x: img.x, y: img.y });
                }
    
                // Rotation animation
                if (img.animations.rotation?.length > 0) {
                    for (const rotAnim of img.animations.rotation) {
                        if (!rotAnim || rotAnim.enabled === false) continue;
                        const animProps = {
                            from: rotAnim.from,
                            to: rotAnim.to,
                            duration: rotAnim.duration,
                            ease: rotAnim.ease,
                            delay: rotAnim.delay,
                            fromEnd: rotAnim.fromEnd
                        };
                        
                        if (rotAnim.loop) {
                            sequence = sequence.loopProperty("sprite", "rotation", animProps);
                        } else {
                            sequence = sequence.animateProperty("sprite", "rotation", animProps);
                        }
                    }
                }
    
                if (img.animations.blur?.length > 0) {
                    sequence = sequence.filter("Blur", { strength: 0.1, blurX: 0.1, blurY: 0.1, quality: 1 }, "blurEffect");
                    for (const blurAnim of img.animations.blur) {
                        if (!blurAnim || blurAnim.enabled === false) continue;
                        sequence = sequence.animateProperty("effectFilters.blurEffect", "strength", {
                            from: blurAnim.fromStrength,
                            to: blurAnim.toStrength,
                            duration: blurAnim.duration,
                            ease: blurAnim.ease,
                            delay: blurAnim.delay
                        })
                        .animateProperty("effectFilters.blurEffect", "blurX", {
                            from: blurAnim.fromBlurX,
                            to: blurAnim.toBlurX,
                            duration: blurAnim.duration,
                            ease: blurAnim.ease,
                            delay: blurAnim.delay
                        })
                        .animateProperty("effectFilters.blurEffect", "blurY", {
                            from: blurAnim.fromBlurY,
                            to: blurAnim.toBlurY,
                            duration: blurAnim.duration,
                            ease: blurAnim.ease,
                            delay: blurAnim.delay
                        });
                    }
                }
    
                // Scale animation
                if (img.animations.scale?.length > 0) {
                    for (const scaleAnim of img.animations.scale) {
                        if (!scaleAnim || scaleAnim.enabled === false) continue;
                        sequence = sequence.animateProperty("sprite", "scale.x", {
                            from: scaleAnim.fromX,
                            to: scaleAnim.toX,
                            duration: scaleAnim.duration,
                            ease: scaleAnim.ease,
                            delay: scaleAnim.delay,
                            fromEnd: scaleAnim.fromEnd
                        })
                        .animateProperty("sprite", "scale.y", {
                            from: scaleAnim.fromY,
                            to: scaleAnim.toY,
                            duration: scaleAnim.duration,
                            ease: scaleAnim.ease,
                            delay: scaleAnim.delay,
                            fromEnd: scaleAnim.fromEnd
                        });
                    }
                }
    
                // Alpha animation
                if (img.animations.alpha?.length > 0) {
                    for (const alphaAnim of img.animations.alpha) {
                        if (!alphaAnim || alphaAnim.enabled === false) continue;
                        sequence = sequence.animateProperty("sprite", "alpha", {
                            from: alphaAnim.from,
                            to: alphaAnim.to,
                            duration: alphaAnim.duration,
                            ease: alphaAnim.ease,
                            delay: alphaAnim.delay,
                            fromEnd: alphaAnim.fromEnd
                        });
                    }
                }
    
                // Apply filters if enabled
                if (img.filters.colorMatrix.enabled) {
                    sequence = sequence.filter("ColorMatrix", {
                        hue: img.filters.colorMatrix.hue,
                        brightness: img.filters.colorMatrix.brightness,
                        contrast: img.filters.colorMatrix.contrast,
                        saturate: img.filters.colorMatrix.saturate
                    });
                }
    
                if (img.filters.glow.enabled) {
                    sequence = sequence.filter("Glow", {
                        distance: img.filters.glow.distance,
                        outerStrength: img.filters.glow.outerStrength,
                        innerStrength: img.filters.glow.innerStrength,
                        color: img.filters.glow.color,
                        quality: img.filters.glow.quality,
                        knockout: img.filters.glow.knockout
                    });
                }
    
                if (img.filters.blur.enabled) {
                    sequence = sequence.filter("Blur", {
                        strength: img.filters.blur.strength,
                        blur: img.filters.blur.blur,
                        blurX: img.filters.blur.blurX,
                        blurY: img.filters.blur.blurY,
                        quality: img.filters.blur.quality,
                        resolution: img.filters.blur.resolution,
                        kernelSize: img.filters.blur.kernelSize
                    });
                }
    
                // Apply persist, attachToSource, and stretchToTarget
                if (img.onToken) {
                    const source = canvas.tokens.controlled[0];
                    const target = game.user.targets.first();
    
                    if (img.attachToSource) {
                        sequence = sequence.attachTo(source, img.attachOptions);
                    }
    
                    if (img.stretchToTarget && target) {
                        sequence = sequence.stretchTo(target, { attachTo: true, tiling: img.stretchToTarget.tiling });
                    }
                    if (img.belowToken) {
                        sequence = sequence.belowTokens();
                    }
    
                    if (img.persist) {
                        sequence = sequence.persist();
                    }
                }
            } else if (element.type === 'text') {
                const text = textData[element.index];
                sequence = sequence
                    .effect()
                    .text(text.text, text.style)
                    .rotate(text.style.rotate || 0);
    
                if (text.persist) {
                    sequence = sequence.persist();
                }
    
                if (text.onToken) {
                    if (text.attach) {
                        sequence = sequence.attachTo(canvas.tokens.controlled[0], text.attachOptions);
                    } else {
                        sequence = sequence.atLocation(canvas.tokens.controlled[0], { cacheLocation: true });
                    }
                } else {
                    sequence = sequence
                        .atLocation({ x: 0, y: 0 })
                        .screenSpaceAboveUI()
                        .screenSpaceAnchor(0.5)
                        .screenSpacePosition({ x: text.x, y: text.y });
                }
    
                sequence = sequence
                    .duration(text.duration)
                    .delay(text.delay)
                    .fadeIn(Number(text.style.fadeInDuration) || 500)
                    .fadeOut(Number(text.style.fadeOutDuration) || 500)
                    .zIndex(50)
                    .animateProperty("sprite", "position.x", {
                        from: text.x,
                        to: text.x + text.style.moveXBy,
                        duration: text.style.movementDuration,
                        ease: text.movementEase,
                        delay: 0,
                        relative: false
                    })
                    .animateProperty("sprite", "position.y", {
                        from: text.y,
                        to: text.y + text.style.moveYBy,
                        duration: text.style.movementDuration,
                        ease: text.movementEase,
                        delay: 0,
                        relative: false
                    })
                    .animateProperty("sprite", "scale.x", {
                        from: 1,
                        to: text.style.scaleXTo || 1,
                        duration: text.style.scaleDuration || 1000,
                        ease: text.style.scaleEase,
                        delay: 0
                    })
                    .animateProperty("sprite", "scale.y", {
                        from: 1,
                        to: text.style.scaleYTo || 1,
                        duration: text.style.scaleDuration || 1000,
                        ease: text.style.scaleEase,
                        delay: 0
                    });
            } else if (element.type === 'sound') {
                const sound = soundData[element.index];
                sequence = sequence
                    .sound()
                    .file(sound.file)
                    .name(`soundEffect${element.index}`)
                    .delay(sound.delay)
                    .fadeInAudio(sound.fadeIn)
                    .fadeOutAudio(sound.fadeOut)
                    .volume(sound.volume);
    
                if (sound.duration !== 0) {
                    sequence = sequence.duration(sound.duration);
                }
    
                if (sound.timeStart !== 0) {
                    sequence = sequence.startTime(sound.timeStart);
                }
                if (sound.timeEnd !== 0) {
                    sequence = sequence.endTime(sound.timeEnd);
                }
            }
        }
    
        // Add sound if configured
        const soundFile = $("#sound-file").text();
        if (soundFile && soundFile !== "None") {
            sequence = sequence.sound()
                .file(soundFile)
                .name("splashshound")
                .fadeInAudio(parseInt($("#fadeInAudio").val()) || 500)
                .fadeOutAudio(parseInt($("#fadeOutAudio").val()) || 500)
                .duration(parseInt($("#audioDuration").val()) || 3000);
        }
    
        // Add final wait and macro chaining
        sequence = sequence
        sequence.play({ preload: true });
    });
    
    
    
    

    // Add the text-target click handler
    $(document).off("click", ".text-target").on("click", ".text-target", function() {
        const slot = $(this).data("slot");
        window.activeTextTargetSlot = slot; // Store the active slot globally
        
        // Define the click handler function
        const clickHandler = (event) => {
            // Remove the overlay when clicking
            $('#clickOverlay').remove();
            document.body.style.cursor = 'default';

            // Only process left clicks
            if (event.button !== 0) return;
            
            // Calculate window center point
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Calculate distance from center (negative values mean left/up from center)
            const relativeX = Math.round(event.clientX - centerX);
            const relativeY = Math.round(centerY - event.clientY); // Inverted Y because positive Y is down in browser
            
            // Update the text coordinates for the active slot
    // Update the text coordinates for the active slot
    // Update the text coordinates for the active slot
    if (window.activeTextTargetSlot !== undefined) {
        // Halve the values before setting them
        const halfX = Math.round(relativeX / 2);
        // Invert Y by removing the negative sign (multiply by -1)
        const halfY = Math.round(relativeY / 2) * -1;  // Added * -1 here to flip the direction
        
        // Update the input values
        const xInput = $(`.text-x[data-slot="${window.activeTextTargetSlot}"]`);
        const yInput = $(`.text-y[data-slot="${window.activeTextTargetSlot}"]`);
        
        xInput.val(halfX);
        yInput.val(halfY);
        
        // Trigger change events
        xInput.trigger('change');
        yInput.trigger('change');
        previewSingleText(slot);
        // Remove the click handler after updating
        document.removeEventListener('click', clickHandler);
        ui.notifications?.info('Text position updated!');
        window.activeTextTargetSlot = undefined; // Clear the active slot
        return;
    }
            
            // Get basic click information
            const clickInfo = {
                // Window dimensions
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                windowCenterX: centerX,
                windowCenterY: centerY,
                
                // Click coordinates (browser)
                clientX: event.clientX,
                clientY: event.clientY,
                
                // Click coordinates (relative to center)
                relativeX: relativeX,
                relativeY: relativeY,
                
                // Target information
                target: event.target?.tagName || 'unknown',
                targetId: event.target?.id || 'no-id',
                targetClasses: Array.from(event.target?.classList || []),
                button: event.button,
                timestamp: Date.now()
            };
            
            // Get canvas-specific information if clicking on the canvas
            if (canvas?.ready) {
                try {
                    // Get mouse position
                    if (canvas.mousePosition) {
                        clickInfo.canvasX = canvas.mousePosition.x;
                        clickInfo.canvasY = canvas.mousePosition.y;
                    }
                    
                    // Get grid position if available
                    if (canvas.grid) {
                        const point = new PIXI.Point(
                            canvas.mousePosition?.x || 0,
                            canvas.mousePosition?.y || 0
                        );
                        const snappedPoint = canvas.grid.getSnappedPoint(point.x, point.y);
                        if (snappedPoint) {
                            clickInfo.gridX = snappedPoint.x;
                            clickInfo.gridY = snappedPoint.y;
                        }
                    }
                    
                    // Get scene coordinates
                    if (canvas.stage) {
                        const worldPos = canvas.app.renderer.events.pointer.getLocalPosition(canvas.stage);
                        clickInfo.sceneX = worldPos.x;
                        clickInfo.sceneY = worldPos.y;
                    }
                    
                    // Get active scene info
                    if (canvas.scene) {
                        clickInfo.sceneName = canvas.scene.name;
                        clickInfo.sceneId = canvas.scene.id;
                    }
                } catch (error) {
                    console.warn('Error getting canvas information:', error);
                }
            }
            
            // Log the relative position in a clear format
            console.log(`Click position relative to center: X ${relativeX >= 0 ? '+' : ''}${relativeX}, Y ${relativeY >= 0 ? '+' : ''}${relativeY}`);
            console.log('Full Click Information:', clickInfo);
            
            // Remove the click handler after logging
            document.removeEventListener('click', clickHandler);
            ui.notifications?.info('Click logger deactivated after capturing click data.');
        };

        // Remove any existing click handler
        document.removeEventListener('click', clickHandler);
        
        // Create an overlay to indicate click mode is active
        const overlay = $('<div id="clickOverlay"></div>').css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            cursor: 'crosshair'
        }).appendTo('body');

        // Create a preview element
        const preview = $('<div id="textPreview"></div>').css({
            position: 'fixed',
            padding: '5px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex: 10000
        }).appendTo('body');

        // Update preview position on mouse move
        $(document).on('mousemove.preview', function(e) {
            const input = $(`.text-input[data-slot="${window.activeTextTargetSlot}"]`);
            const previewText = input.val().substring(0, 15);
            preview.text(previewText);
            preview.css({
                left: e.clientX + 15,
                top: e.clientY + 15
            });
        });

        // Clean up preview on click
        document.addEventListener('click', function cleanup() {
            preview.remove();
            $(document).off('mousemove.preview');
            document.removeEventListener('click', cleanup);
        }, { once: true });

        document.body.style.cursor = 'crosshair';
        
        // Add the new click handler
        document.addEventListener('click', clickHandler);
        
        ui.notifications?.info('Click anywhere on the screen to set text position');
    });



    // Handle paste style button clicks
    $(document).off("click", ".paste-style").on("click", ".paste-style", function() {
        const slot = $(this).data("slot");
        ensureTextDataIntegrity();
        
        if (!copiedTextStyle) {
            ui.notifications.warn("No style copied yet!");
            return;
        }
        
        // Update only the style properties
        window.textData[slot].style = { ...copiedTextStyle };
        ui.notifications.info("Style pasted!");
    });


    // Handle image selection for multiple slots
    $(document).off("click", ".file-picker").on("click", ".file-picker", async function() {
        const slot = $(this).data("slot");
        console.log(`Picking file for slot ${slot}`);
        
        try {
            const selectedFile = await filepickerPromise("");
            console.log(`Selected file: ${selectedFile}`);
            
            const defaultDuration = parseInt($("#durationValue").val()) || 3000;
            
            // Get current values from inputs
            const currentX = parseInt($(`.image-x[data-slot="${slot}"]`).val()) || 0;
            const currentY = parseInt($(`.image-y[data-slot="${slot}"]`).val()) || 0;
            const currentScale = parseFloat($(`.image-scale[data-slot="${slot}"]`).val()) || 1;
            const currentOpacity = parseFloat($(`.image-opacity[data-slot="${slot}"]`).val()) || 1;
            const currentDuration = parseInt($(`.image-duration[data-slot="${slot}"]`).val()) || defaultDuration;
            const currentDelay = parseInt($(`.image-delay[data-slot="${slot}"]`).val()) || 0;
            const currentMoveToX = parseInt($(`.image-moveto-x[data-slot="${slot}"]`).val()) || 0;
            const currentMoveToY = parseInt($(`.image-moveto-y[data-slot="${slot}"]`).val()) || 0;
            const currentMove = parseFloat($(`.image-move[data-slot="${slot}"]`).val()) || 0;
            const currentZIndex = parseInt($(`.image-zindex[data-slot="${slot}"]`).val()) || 1;
            const currentFadeInDuration = parseInt($(`.image-fadeInDuration[data-slot="${slot}"]`).val()) || 500;
            const currentFadeOutDuration = parseInt($(`.image-fadeOutDuration[data-slot="${slot}"]`).val()) || 500;
            const currentMirrorX = $(`.image-mirror-x[data-slot="${slot}"]`).prop('checked') || false;
            const currentMirrorY = $(`.image-mirror-y[data-slot="${slot}"]`).prop('checked') || false;
            const currentOnToken = $(`.image-on-token[data-slot="${slot}"]`).prop('checked') || false;

            // Update the image data
            imgData[slot] = {
                file: selectedFile,
                x: currentX,
                y: currentY,
                scale: currentScale,
                opacity: currentOpacity,
                duration: currentDuration,
                delay: currentDelay,
                moveToX: currentMoveToX,
                moveToY: currentMoveToY,
                move: currentMove,
                zIndex: currentZIndex,
                fadeInDuration: currentFadeInDuration,
                fadeOutDuration: currentFadeOutDuration,
                mirrorX: currentMirrorX,
                mirrorY: currentMirrorY,
                onToken: currentOnToken,
                size: {
                    width: null,
                    height: null,
                    gridUnits: false
                },
                filters: {
                    colorMatrix: {
                        enabled: false,
                        hue: 0,
                        brightness: 1,
                        contrast: 1,
                        saturate: 0
                    },
                    glow: {
                        enabled: false,
                        distance: 10,
                        outerStrength: 4,
                        innerStrength: 0,
                        color: 0xffffff,
                        quality: 0.1,
                        knockout: false
                    },
                    blur: {
                        enabled: false,
                        strength: 8,
                        blur: 2,
                        blurX: 2,
                        blurY: 2,
                        quality: 4,
                        resolution: 1,
                        kernelSize: 5
                    }
                },
                animations: {
                    position: {
                        enabled: false,
                        moveToX: 0,
                        moveToY: 0,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        gridUnits: false,
                        fromEndX: false,
                        fromEndY: false
                    },
                    rotation: {
                        enabled: false,
                        from: 0,
                        to: 360,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        fromEnd: false,
                        loop: false
                    },
                    scale: {
                        enabled: false,
                        fromX: 1,
                        toX: 1,
                        fromY: 1,
                        toY: 1,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        fromEnd: false
                    },
                    alpha: {
                        enabled: false,
                        from: 1,
                        to: 1,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        fromEnd: false
                    }
                },
                persist: false,
                attachToSource: false,
                stretchToTarget: {
                    enabled: false,
                    tiling: false
                },
                belowToken: false,

                attachOptions: {
                    align: "center",
                    edge: "on",
                    bindVisibility: true,
                    bindAlpha: true,
                    followRotation: true,
                    randomOffset: false,
                    offset: { x: 0, y: 0 }
                }
            };
            
            console.log(`Updated slot ${slot} with file ${selectedFile}`, imgData[slot]);

            // Update UI
            $(`.image-file[data-slot="${slot}"]`).text(selectedFile);
            $(`.clear-image[data-slot="${slot}"]`).show();
            

            $(`.image-slot[data-slot="${slot}"] .image-controls`).show();
            $(`.preview-image[data-slot="${slot}"]`).show();
            $(`.configure-fx[data-slot="${slot}"]`).show();
            $(`.configure-animation[data-slot="${slot}"]`).show();
            $(`.image-x[data-slot="${slot}"]`).val(currentX);
            $(`.image-y[data-slot="${slot}"]`).val(currentY);
            $(`.image-scale[data-slot="${slot}"]`).val(currentScale);
            $(`.image-opacity[data-slot="${slot}"]`).val(currentOpacity);
            $(`.image-duration[data-slot="${slot}"]`).val(currentDuration);
            $(`.image-delay[data-slot="${slot}"]`).val(currentDelay);
            $(`.image-moveto-x[data-slot="${slot}"]`).val(currentMoveToX);
            $(`.image-moveto-y[data-slot="${slot}"]`).val(currentMoveToY);
            $(`.image-move[data-slot="${slot}"]`).val(currentMove);
            $(`.image-zindex[data-slot="${slot}"]`).val(currentZIndex);
            $(`.image-fadeInDuration[data-slot="${slot}"]`).val(currentFadeInDuration);
            $(`.image-fadeOutDuration[data-slot="${slot}"]`).val(currentFadeOutDuration);
            $(`.image-mirror-x[data-slot="${slot}"]`).prop('checked', currentMirrorX);
            $(`.image-mirror-y[data-slot="${slot}"]`).prop('checked', currentMirrorY);
            $(`.imgontoken[data-slot="${slot}"]`).show();
            $(`.token-image-controls[data-slot="${slot}"] .token-options-container`).remove();
            // Add persist, attachToSource, and stretchToTarget checkboxes
            const checkboxContainer = $(`                        <div class="token-options-container" style="
                                background: lightgray;
                                color: black;
                                padding: 5px;
                                border-radius: 3px;
                                margin-top: 3px;
                            ">
                <div style="margin-top: 10px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" class="image-persist" data-slot="${slot}">
                        <label>Persist?</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                        <input type="checkbox" class="image-attach-source" data-slot="${slot}">
                        <label>Attach to Source Token?</label>
    <button class="attach-options-btnimage" data-slot="${slot}" style="margin-left: 5px;background: rgb(74, 100, 132) !important; color: white !important; border: none !important; border-radius: 3px !important; cursor: pointer !important;">Attach Options</button>
                        
                    </div>

                    
                            <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 5px;">
                                <div style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" class="image-stretch-target" data-slot="${slot}">
                                    <label>Stretch to Target?</label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px; margin-left: 20px;">
                                    <input type="checkbox" class="image-stretch-target-tiling" data-slot="${slot}">
                                    <label>Tiling</label>
                                </div>
                            </div>

                    <div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                        <input type="checkbox" class="image-below-token" data-slot="${slot}">
                        <label>Image Below Token?</label>
                    </div>
                </div>
            `);
            
            $(`.token-image-controls[data-slot="${slot}"]`).append(checkboxContainer);
            
            // Add event listeners for the new checkboxes
            $(`.image-persist[data-slot="${slot}"]`).on('change', function() {
                imgData[slot].persist = $(this).is(':checked');
            });
            
            $(`.attach-options-btnimage[data-slot="${slot}"]`).on('click', function() {
                openAttachOptionsDialog(slot, 'image');
            });


            $(`.image-attach-source[data-slot="${slot}"]`).on('change', function() {
                const checked = $(this).is(':checked');
                imgData[slot].attachToSource = checked;
                // Show/hide the attach options button (button already exists from document.ready)
                const btn = $(`.attach-options-btnimage[data-slot="${slot}"]`).filter(function() {
                    return $(this).prev().hasClass('image-attach-source');
                });
                btn.toggle(checked);
            });

            $(`.image-below-token[data-slot="${slot}"]`).on('change', function() {
                imgData[slot].belowToken = $(this).is(':checked');
            });
            
            $(`.image-stretch-target[data-slot="${slot}"]`).on('change', function() {
                if (!imgData[slot].stretchToTarget) return;
                imgData[slot].stretchToTarget = {
                    enabled: true,
                    tiling: $(this).is(':checked')
                };
            });
            
            $(`.image-stretch-target-tiling[data-slot="${slot}"]`).on('change', function() {
                if (!imgData[slot].stretchToTarget) return;
                imgData[slot].stretchToTarget = {
                    enabled: true,
                    tiling: $(this).is(':checked')
                };
            });
        } catch (error) {
            console.error("Error selecting file:", error);
            ui.notifications.error("Failed to select file");
        }
    });

    // Handle clearing individual images
    $(document).off("click", ".clear-image").on("click", ".clear-image", function() {
        ensureimgDataIntegrity();
        const slot = parseInt($(this).data("slot"));
        
        imgData[slot] = {
            file: "",
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 3000,
            delay: 0,
            moveToX: 0,
            moveToY: 0,
            move: 0,
            zIndex: 1,
            fadeInDuration: 500,
            fadeOutDuration: 500,
            mirrorX: false,
            mirrorY: false,
            onToken: false,
            size: {
                width: null,
                height: null,
                gridUnits: false
            },
            filters: {
                colorMatrix: {
                    enabled: false,
                    hue: 0,
                    brightness: 1,
                    contrast: 1,
                    saturate: 0
                },
                glow: {
                    enabled: false,
                    distance: 10,
                    outerStrength: 4,
                    innerStrength: 0,
                    color: 0xffffff,
                    quality: 0.1,
                    knockout: false
                },
                blur: {
                    enabled: false,
                    strength: 8,
                    blur: 2,
                    blurX: 2,
                    blurY: 2,
                    quality: 4,
                    resolution: 1,
                    kernelSize: 5
                }
            },
            animations: {
                position: {
                    enabled: false,
                    moveToX: 0,
                    moveToY: 0,
                    duration: 1000,
                    ease: "linear",
                    delay: 0,
                    gridUnits: false,
                    fromEndX: false,
                    fromEndY: false
                },
                rotation: {
                    enabled: false,
                    from: 0,
                    to: 360,
                    duration: 1000,
                    ease: "linear",
                    delay: 0,
                    fromEnd: false,
                    loop: false
                },
                scale: {
                    enabled: false,
                    fromX: 1,
                    toX: 1,
                    fromY: 1,
                    toY: 1,
                    duration: 1000,
                    ease: "linear",
                    delay: 0,
                    fromEnd: false
                },
                alpha: {
                    enabled: false,
                    from: 1,
                    to: 1,
                    duration: 1000,
                    ease: "linear",
                    delay: 0,
                    fromEnd: false
                }
            },
            persist: false,
            attachToSource: false,
            stretchToTarget: {
                enabled: false,
                tiling: false
            },
            belowToken: false,
            attachOptions: {
                align: "center",
                edge: "on",
                bindVisibility: true,
                bindAlpha: true,
                followRotation: true,
                randomOffset: false,
                offset: { x: 0, y: 0 }
            }
        };
        
        console.log(`Cleared slot ${slot}`, imgData[slot]);

        // Reset UI
        $(`.image-file[data-slot="${slot}"]`).text("");
        $(`.clear-image[data-slot="${slot}"]`).hide();
        $(`.image-slot[data-slot="${slot}"] .image-controls`).hide();
        $(`.preview-image[data-slot="${slot}"]`).hide();
        $(`.configure-fx[data-slot="${slot}"]`).hide();
        $(`.configure-animation[data-slot="${slot}"]`).hide();
        $(`.image-x[data-slot="${slot}"]`).val(0);
        $(`.image-y[data-slot="${slot}"]`).val(0);
        $(`.image-scale[data-slot="${slot}"]`).val(1);
        $(`.image-opacity[data-slot="${slot}"]`).val(1);
        $(`.image-duration[data-slot="${slot}"]`).val(3000);
        $(`.image-delay[data-slot="${slot}"]`).val(0);
        $(`.image-moveto-x[data-slot="${slot}"]`).val(0);
        $(`.image-moveto-y[data-slot="${slot}"]`).val(0);
        $(`.image-move[data-slot="${slot}"]`).val(0);
        $(`.image-zindex[data-slot="${slot}"]`).val(1);
        $(`.image-fadeInDuration[data-slot="${slot}"]`).val(500);
        $(`.image-fadeOutDuration[data-slot="${slot}"]`).val(500);
        $(`.image-mirror-x[data-slot="${slot}"]`).prop('checked', false);
        $(`.image-mirror-y[data-slot="${slot}"]`).prop('checked', false);
        $(`.image-on-token[data-slot="${slot}"]`).prop('checked', false);
        $(`.imgontoken[data-slot="${slot}"]`).hide();
        $(`.token-image-controls[data-slot="${slot}"]`).hide();
        $(`.image-persist[data-slot="${slot}"]`).prop('checked', false);
        $(`.image-attach-source[data-slot="${slot}"]`).prop('checked', false);
        $(`.image-stretch-target[data-slot="${slot}"]`).prop('checked', false);
    $(`.image-below-token[data-slot="${slot}"]`).prop('checked', false);

    });

    //ok


    // Add the FX dialog handler
    $(document).off("click", ".configure-fx").on("click", ".configure-fx", async function() {
        const slot = $(this).data("slot");
        ensureimgDataIntegrity();
        
        const currentFilters = imgData[slot].filters;
        
        const fxDialog = new Dialog({
            title: `Configure FX - Image ${slot + 1}`,
            content: `
                <style>
                #fxdialogstyle {
                        width: auto !important;
                    height: auto !important;
                    max-width: 800px !important;
                    background-color: rgba(30, 30, 30, 0.95) !important;
                    border: 2px solid #4a90e2 !important;
                    border-radius: 10px !important;
                    box-shadow: 0 4px 20px rgba(74, 144, 226, 0.3) !important;
                    backdrop-filter: blur(5px) !important;
                    overflow: auto !important;
                    color: #fff !important;
                }
                    .tab-content { display: none; }
                    .tab-content.active { display: block; }
                    .fx-tabs { 
                        display: flex;
                        border-bottom: 1px solid #782e22;
                        margin-bottom: 10px;
                    }
                    .fx-tab { 
                        cursor: pointer;
                        padding: 5px 15px;
                        margin-right: 5px;
                        border: 1px solid #782e22;
                        border-bottom: none;
                        background: rgba(0, 0, 0, 0.05);
                    }
                    .fx-tab.active { 
                        background: #000;
                        color: #fff;
                    }
                    .grid { 
                        display: grid;
                        grid-template-columns: 120px 1fr;
                        gap: 8px;
                        align-items: center;
                        margin: 8px 0;
                    }
                    .grid label { 
                        text-align: right;
                        padding-right: 10px;
                        color: #4b4a44;
                    }
                    .grid input[type="range"] { width: 100%; }
                    .grid input[type="number"] { width: 80px; }
                    .slider-value {
                        margin-left: 8px;
                        color: #666;
                    }
                    .filter-section {
                        background: rgba(0, 0, 0, 0.05);
                        padding: 8px;
                        margin: 8px 0;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                    }
                </style>
                
                <div class="fx-tabs">
                    <div class="fx-tab active" data-tab="colormatrix">Color Matrix</div>
                    <div class="fx-tab" data-tab="glow">Glow</div>
                    <div class="fx-tab" data-tab="blur">Blur</div>
                </div>

                <div id="colormatrix" class="tab-content active">
                    <div class="filter-section">
                        <div class="grid">
                            <label>Enable Filter:</label>
                            <input type="checkbox" class="filter-colormatrix-enabled" ${currentFilters.colorMatrix.enabled ? 'checked' : ''}>
                        </div>
                        <div class="colormatrix-controls">
                            <div class="grid">
                                <label>Hue:</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="range" class="filter-colormatrix-hue" min="0" max="360" value="${currentFilters.colorMatrix.hue}">
                                    <span class="filter-colormatrix-hue-value slider-value">${currentFilters.colorMatrix.hue}°</span>
                                </div>
                            </div>
                            <div class="grid">
                                <label>Brightness:</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="range" class="filter-colormatrix-brightness" min="0" max="100" value="${currentFilters.colorMatrix.brightness * 100}">
                                    <span class="filter-colormatrix-brightness-value slider-value">${currentFilters.colorMatrix.brightness}</span>
                                </div>
                            </div>
                            <div class="grid">
                                <label>Contrast:</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="range" class="filter-colormatrix-contrast" min="0" max="100" value="${currentFilters.colorMatrix.contrast * 100}">
                                    <span class="filter-colormatrix-contrast-value slider-value">${currentFilters.colorMatrix.contrast}</span>
                                </div>
                            </div>
                            <div class="grid">
                                <label>Saturate:</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="range" class="filter-colormatrix-saturate" min="-100" max="100" value="${currentFilters.colorMatrix.saturate * 100}">
                                    <span class="filter-colormatrix-saturate-value slider-value">${currentFilters.colorMatrix.saturate}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="glow" class="tab-content">
                    <div class="filter-section">
                        <div class="grid">
                            <label>Enable Filter:</label>
                            <input type="checkbox" class="filter-glow-enabled" ${currentFilters.glow.enabled ? 'checked' : ''}>
                        </div>
                        <div class="glow-controls">
                            <div class="grid">
                                <label>Distance:</label>
                                <input type="number" class="filter-glow-distance" value="${currentFilters.glow.distance}" min="0" max="50">
                            </div>
                            <div class="grid">
                                <label>Outer Strength:</label>
                                <input type="number" class="filter-glow-outerStrength" value="${currentFilters.glow.outerStrength}" min="0" max="20" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Inner Strength:</label>
                                <input type="number" class="filter-glow-innerStrength" value="${currentFilters.glow.innerStrength}" min="0" max="20" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Color:</label>
                                <input type="color" class="filter-glow-color" value="#${currentFilters.glow.color.toString(16).padStart(6, '0')}">
                            </div>
                            <div class="grid">
                                <label>Quality:</label>
                                <div style="display: flex; align-items: center;">
                                    <input type="range" class="filter-glow-quality" min="1" max="100" value="${currentFilters.glow.quality * 100}">
                                    <span class="filter-glow-quality-value slider-value">${currentFilters.glow.quality}</span>
                                </div>
                            </div>
                            <div class="grid">
                                <label>Knockout:</label>
                                <input type="checkbox" class="filter-glow-knockout" ${currentFilters.glow.knockout ? 'checked' : ''}>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="blur" class="tab-content">
                    <div class="filter-section">
                        <div class="grid">
                            <label>Enable Filter:</label>
                            <input type="checkbox" class="filter-blur-enabled" ${currentFilters.blur.enabled ? 'checked' : ''}>
                        </div>
                        <div class="blur-controls">
                            <div class="grid">
                                <label>Strength:</label>
                                <input type="number" class="filter-blur-strength" value="${currentFilters.blur.strength}" min="0" max="20" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Blur:</label>
                                <input type="number" class="filter-blur-blur" value="${currentFilters.blur.blur}" min="0" max="20" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Blur X:</label>
                                <input type="number" class="filter-blur-blurX" value="${currentFilters.blur.blurX}" min="0" max="20" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Blur Y:</label>
                                <input type="number" class="filter-blur-blurY" value="${currentFilters.blur.blurY}" min="0" max="20" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Quality:</label>
                                <input type="number" class="filter-blur-quality" value="${currentFilters.blur.quality}" min="1" max="10">
                            </div>
                            <div class="grid">
                                <label>Resolution:</label>
                                <input type="number" class="filter-blur-resolution" value="${currentFilters.blur.resolution}" min="0.1" max="2" step="0.1">
                            </div>
                            <div class="grid">
                                <label>Kernel Size:</label>
                                <input type="number" class="filter-blur-kernelSize" value="${currentFilters.blur.kernelSize}" min="3" max="15" step="2">
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: {
                apply: {
                    label: "Apply",
                    callback: (html) => {
                        const newFilters = {
                            colorMatrix: {
                                enabled: html.find('.filter-colormatrix-enabled').prop('checked'),
                                hue: parseFloat(html.find('.filter-colormatrix-hue').val()),
                                brightness: parseFloat(html.find('.filter-colormatrix-brightness').val()) / 100,
                                contrast: parseFloat(html.find('.filter-colormatrix-contrast').val()) / 100,
                                saturate: parseFloat(html.find('.filter-colormatrix-saturate').val()) / 100
                            },
                            glow: {
                                enabled: html.find('.filter-glow-enabled').prop('checked'),
                                distance: parseFloat(html.find('.filter-glow-distance').val()),
                                outerStrength: parseFloat(html.find('.filter-glow-outerStrength').val()),
                                innerStrength: parseFloat(html.find('.filter-glow-innerStrength').val()),
                                color: parseInt(html.find('.filter-glow-color').val().replace("#", ""), 16),
                                quality: parseFloat(html.find('.filter-glow-quality').val()) / 100,
                                knockout: html.find('.filter-glow-knockout').prop('checked')
                            },
                            blur: {
                                enabled: html.find('.filter-blur-enabled').prop('checked'),
                                strength: parseFloat(html.find('.filter-blur-strength').val()),
                                blur: parseFloat(html.find('.filter-blur-blur').val()),
                                blurX: parseFloat(html.find('.filter-blur-blurX').val()),
                                blurY: parseFloat(html.find('.filter-blur-blurY').val()),
                                quality: parseInt(html.find('.filter-blur-quality').val()),
                                resolution: parseFloat(html.find('.filter-blur-resolution').val()),
                                kernelSize: parseInt(html.find('.filter-blur-kernelSize').val())
                            }
                        };
                        
                        imgData[slot].filters = newFilters;
                        console.log(`Updated filters for image ${slot + 1}:`, newFilters);
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            },
            render: (html) => {
                // Tab switching functionality
                html.find('.fx-tab').on('click', function() {
                    const tab = $(this).data('tab');
                    html.find('.fx-tab').removeClass('active');
                    html.find('.tab-content').removeClass('active');
                    $(this).addClass('active');
                    html.find(`#${tab}`).addClass('active');
                });

                // Live updates for range inputs
                html.find('.filter-colormatrix-hue').on('input', function() {
                    html.find('.filter-colormatrix-hue-value').text($(this).val() + '°');
                });

                html.find('.filter-colormatrix-brightness').on('input', function() {
                    html.find('.filter-colormatrix-brightness-value').text(($(this).val() / 100).toFixed(2));
                });

                html.find('.filter-colormatrix-contrast').on('input', function() {
                    html.find('.filter-colormatrix-contrast-value').text(($(this).val() / 100).toFixed(2));
                });

                html.find('.filter-colormatrix-saturate').on('input', function() {
                    html.find('.filter-colormatrix-saturate-value').text(($(this).val() / 100).toFixed(2));
                });

                html.find('.filter-glow-quality').on('input', function() {
                    html.find('.filter-glow-quality-value').text(($(this).val() / 100).toFixed(2));
                });
            }
        });
        
        fxDialog.render(true, {
            id: "fxdialogstyle"
        });
    });

    // Handle changes to image coordinates, scale, duration, and delay
    $(document).off("change", ".image-x, .image-y, .image-scale, .image-opacity, .image-duration, .image-delay, .image-moveto-x, .image-moveto-y, .image-move, .image-zindex, .image-fadeInDuration, .image-fadeOutDuration, .image-mirror-x, .image-mirror-y, .image-on-token, .image-size-width, .image-size-height, .image-size-grid-units")
        .on("change", ".image-x, .image-y, .image-scale, .image-opacity, .image-duration, .image-delay, .image-moveto-x, .image-moveto-y, .image-move, .image-zindex, .image-fadeInDuration, .image-fadeOutDuration, .image-mirror-x, .image-mirror-y, .image-on-token, .image-size-width, .image-size-height, .image-size-grid-units", function() {
            ensureimgDataIntegrity();
            const $this = $(this);
            const slot = parseInt($this.attr("data-slot"));
            const type = $this.attr("class").split(" ")[0].split("-").slice(1).join("-"); // Fix for moveto-x and moveto-y
            console.log("Change event:", {
                slot,
                type,
                value: $this.val(),
                element: $this[0]
            });

            if (slot >= 0 && slot < nOfSlots && imgData[slot]) {
                if (type === 'scale') {
                    imgData[slot].scale = parseFloat($this.val()) || 1;
                } else if (type === 'opacity') {
                    imgData[slot].opacity = parseFloat($this.val()) || 1;
                } else if (type === 'moveto-x') {
                    imgData[slot].moveToX = parseInt($this.val()) || 0;
                } else if (type === 'moveto-y') {
                    imgData[slot].moveToY = parseInt($this.val()) || 0;
                } else if (type === 'zindex') {
                    imgData[slot].zIndex = parseInt($this.val()) || 1;
                } else if (type === 'fadeinduration') {
                    imgData[slot].fadeInDuration = parseInt($this.val()) || 500;
                } else if (type === 'fadeoutduration') {
                    imgData[slot].fadeOutDuration = parseInt($this.val()) || 500;
                } else if (type === 'mirror-x') {
                    imgData[slot].mirrorX = $this.prop('checked');
                } else if (type === 'mirror-y') {
                    imgData[slot].mirrorY = $this.prop('checked');
                } else if (type === 'on-token') {
                    imgData[slot].onToken = $this.prop('checked');
                } else if (type === 'size-width') {
                    if (!imgData[slot].size) {
                        imgData[slot].size = {
                            width: null,
                            height: null,
                            gridUnits: false
                        };
                    }
                    const width = parseFloat($this.val());
                    imgData[slot].size.width = width || null;
                } else if (type === 'size-height') {
                    if (!imgData[slot].size) {
                        imgData[slot].size = {
                            width: null,
                            height: null,
                            gridUnits: false
                        };
                    }
                    const height = parseFloat($this.val());
                    imgData[slot].size.height = height || null;
                } else if (type === 'size-grid-units') {
                    if (!imgData[slot].size) {
                        imgData[slot].size = {
                            width: null,
                            height: null,
                            gridUnits: false
                        };
                    }
                    imgData[slot].size.gridUnits = $this.prop('checked');
                } else {
                    imgData[slot][type] = parseInt($this.val()) || 0;
                }
                console.log(`Updated slot ${slot}:`, imgData[slot]);
            } else {
                console.error(`Invalid slot ${slot} or imgData not properly initialized`);
            }
        });

    // Animation dialog function
    function openAnimationDialog(slot) {
        const img = imgData[slot];
        
        if (!img || !img.file) {
            ui.notifications.warn("Please select an image first");
            return;
        }
        
        if (!img.animations) {
            img.animations = {
                position: [],
                rotation: [],
                scale: [],
                alpha: [],
                blur: [],
                colorMatrix: [],
                glow: []
            };
        }

        // Ensure animations are initialized as arrays
        if (!Array.isArray(img.animations.position)) img.animations.position = [];
        if (!Array.isArray(img.animations.rotation)) img.animations.rotation = [];
        if (!Array.isArray(img.animations.scale)) img.animations.scale = [];
        if (!Array.isArray(img.animations.alpha)) img.animations.alpha = [];
        if (!Array.isArray(img.animations.blur)) img.animations.blur = [];

        const content = `
        <style>
            #confanim {
                width: auto !important;
                height: auto !important;
                max-width: 800px !important;
                //background-color: rgba(30, 30, 30, 0.85) !important;
                //border: 1px solid rgba(74, 144, 226, 0.5) !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 15px rgba(74, 144, 226, 0.2) !important;
                backdrop-filter: blur(5px) !important;
                overflow: auto !important;
               // color: #e0e0e0 !important;
                padding: 12px !important;
            }
        
            .tabs {
                display: flex;
                gap: 2px;
                margin-bottom: 15px;
                border-bottom: 1px solid rgba(74, 144, 226, 0.3);
                padding-bottom: 2px;
            }
            .tab-content { 
                display: none;
                padding: 15px 10px;
            }
            .tab-content.active { 
                display: block;
                animation: fadeIn 0.3s ease-in-out;
            }
            .anim-tab { 
                cursor: pointer;
                padding: 8px 16px;
                border-radius: 5px 5px 0 0;
                background: rgba(60, 60, 60, 0.3);
                transition: all 0.2s ease;
                border: none;
            }
            .anim-tab:hover {
                background: rgba(74, 144, 226, 0.2);
                color: red;
            }
            .anim-tab.active { 
                background: rgba(74, 144, 226, 0.25);
            }
            .grid { 
                display: grid;
                grid-template-columns: 120px 1fr;
                gap: 10px;
                margin: 10px 0;
                align-items: center;
            }
            .grid label { 
                text-align: right;
                padding-right: 10px;
                font-size: 0.95em;
            }
            .grid input[type="number"], 
            .grid input[type="text"],
            .grid select { 
                width: 100%;
                padding: 5px 8px;
                background: rgba(40, 40, 40, 0.6);
                border: 1px solid rgba(74, 144, 226, 0.3);
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .grid input[type="number"]:focus,
            .grid input[type="text"]:focus,
            .grid select:focus {
                outline: none;
                border-color: #4a90e2;
                box-shadow: 0 0 5px rgba(74, 144, 226, 0.3);
                background: rgba(40, 40, 40, 0.8);
            }
            .grid input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #4a90e2;
            }

            button.remove-btn {
                background: rgba(226, 74, 74, 0.7);
                margin-top: 10px;
            }
            button.remove-btn:hover {
                background: rgba(226, 74, 74, 0.9);
            }
            #addPositionAnimation,
            #addRotationAnimation,
            #addScaleAnimation,
            #addAlphaAnimation,
            #addBlurAnimation {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                margin: 10px 0;
                background: rgba(69, 160, 73, 0.7);
            }
            details {
                border: 1px solid rgba(74, 144, 226, 0.15);
                border-radius: 5px;
                padding: 10px;
                margin: 10px 0;
                background: #ccc;
            }
            details summary {
                cursor: pointer;
                padding: 5px;
                color: #333;
                font-weight: bold;
            }
            details[open] summary {
                margin-bottom: 10px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        </style>
        
        <div class="tabs">
            <div class="anim-tab active" data-tab="position">Position</div>
            <div class="anim-tab" data-tab="rotation">Rotation</div>
            <div class="anim-tab" data-tab="scale">Scale</div>
            <div class="anim-tab" data-tab="alpha">Alpha</div>
            <div class="anim-tab" data-tab="blur">Blur</div>
        </div>
        
        <div class="tab-contents">
            <div id="position" class="tab-content active">
                <div class="grid">
                    <label>Enabled:</label>
                    <input type="checkbox" name="position.enabled" ${img.animations.position[0]?.enabled ? 'checked' : ''}>
                    <button type="button" id="addPositionAnimation" data-slot="${slot}" title="Add new position animation">+</button>
                </div>
                <div id="positionAnimations">
                    ${img.animations.position.map((anim, index) => `
                        <details>
                            <summary>Position ${index + 1}</summary>
                            <div class="grid">
                                <label>Enabled:</label>
                                <input type="checkbox" name="position[${index}].enabled" ${anim.enabled ? 'checked' : ''}>
                                <label>Move X by:</label>
                                <input type="number" name="position[${index}].moveToX" value="${anim.moveToX}">
                                <label>Move Y by:</label>
                                <input type="number" name="position[${index}].moveToY" value="${anim.moveToY}">
                                <label>Duration (ms):</label>
                                <input type="number" name="position[${index}].duration" value="${anim.duration}">
                                <label>Delay (ms):</label>
                                <input type="number" name="position[${index}].delay" value="${anim.delay}">
                                <label>Ease:</label>
                                <select name="position[${index}].ease">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${anim.ease === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                                <label>Grid Units:</label>
                                <input type="checkbox" name="position[${index}].gridUnits" ${anim.gridUnits ? 'checked' : ''}>
                                <label>From End X:</label>
                                <input type="checkbox" name="position[${index}].fromEndX" ${anim.fromEndX ? 'checked' : ''}>
                                <label>From End Y:</label>
                                <input type="checkbox" name="position[${index}].fromEndY" ${anim.fromEndY ? 'checked' : ''}>
                            </div>
                            <button type="button" class="remove-btn removePositionAnimation" data-slot="${slot}" data-index="${index}">Remove</button>
                        </details>
                    `).join('')}
                </div>
            </div>
        
            <div id="rotation" class="tab-content">
                <div class="grid">
                    <label>Enabled:</label>
                    <input type="checkbox" name="rotation.enabled" ${img.animations.rotation[0]?.enabled ? 'checked' : ''}>
                    <button type="button" id="addRotationAnimation" data-slot="${slot}">+</button>
                </div>
                <div id="rotationAnimations">
                    ${img.animations.rotation.map((anim, index) => `
                        <details>
                            <summary>Rotation ${index + 1}</summary>
                            <div class="grid">
                                <label>Enabled:</label>
                                <input type="checkbox" name="rotation[${index}].enabled" ${anim.enabled ? 'checked' : ''}>
                                <label>From:</label>
                                <input type="number" name="rotation[${index}].from" value="${anim.from}">
                                <label>To:</label>
                                <input type="number" name="rotation[${index}].to" value="${anim.to}">
                                <label>Duration (ms):</label>
                                <input type="number" name="rotation[${index}].duration" value="${anim.duration}">
                                <label>Delay (ms):</label>
                                <input type="number" name="rotation[${index}].delay" value="${anim.delay}">
                                <label>Ease:</label>
                                <select name="rotation[${index}].ease">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${anim.ease === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                                <label>Loop:</label>
                                <input type="checkbox" name="rotation[${index}].loop" ${anim.loop ? 'checked' : ''}>
                                <label>From End:</label>
                                <input type="checkbox" name="rotation[${index}].fromEnd" ${anim.fromEnd ? 'checked' : ''}>
                            </div>
                            <button type="button" class="remove-btn removeRotationAnimation" data-slot="${slot}" data-index="${index}">Remove</button>
                        </details>
                    `).join('')}
                </div>
            </div>
        
            <div id="scale" class="tab-content">
                <div class="grid">
                    <label>Enabled:</label>
                    <input type="checkbox" name="scale.enabled" ${img.animations.scale[0]?.enabled ? 'checked' : ''}>
                    <button type="button" id="addScaleAnimation" data-slot="${slot}">+</button>
                </div>
                <div id="scaleAnimations">
                    ${img.animations.scale.map((anim, index) => `
                        <details>
                            <summary>Scale ${index + 1}</summary>
                            <div class="grid">
                                <label>Enabled:</label>
                                <input type="checkbox" name="scale[${index}].enabled" ${anim.enabled ? 'checked' : ''}>
                                <label>From X:</label>
                                <input type="number" name="scale[${index}].fromX" value="${anim.fromX}">
                                <label>To X:</label>
                                <input type="number" name="scale[${index}].toX" value="${anim.toX}">
                                <label>From Y:</label>
                                <input type="number" name="scale[${index}].fromY" value="${anim.fromY}">
                                <label>To Y:</label>
                                <input type="number" name="scale[${index}].toY" value="${anim.toY}">
                                <label>Duration (ms):</label>
                                <input type="number" name="scale[${index}].duration" value="${anim.duration}">
                                <label>Delay (ms):</label>
                                <input type="number" name="scale[${index}].delay" value="${anim.delay}">
                                <label>Ease:</label>
                                <select name="scale[${index}].ease">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${anim.ease === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                                <label>From End:</label>
                                <input type="checkbox" name="scale[${index}].fromEnd" ${anim.fromEnd ? 'checked' : ''}>
                            </div>
                            <button type="button" class="remove-btn removeScaleAnimation" data-slot="${slot}" data-index="${index}">Remove</button>
                        </details>
                    `).join('')}
                </div>
            </div>
        
            <div id="alpha" class="tab-content">
                <div class="grid">
                    <label>Enabled:</label>
                    <input type="checkbox" name="alpha.enabled" ${img.animations.alpha[0]?.enabled ? 'checked' : ''}>
                    <button type="button" id="addAlphaAnimation" data-slot="${slot}">+</button>
                </div>
                <div id="alphaAnimations">
                    ${img.animations.alpha.map((anim, index) => `
                        <details>
                            <summary>Alpha ${index + 1}</summary>
                            <div class="grid">
                                <label>Enabled:</label>
                                <input type="checkbox" name="alpha[${index}].enabled" ${anim.enabled ? 'checked' : ''}>
                                <label>From:</label>
                                <input type="number" name="alpha[${index}].from" value="${anim.from}">
                                <label>To:</label>
                                <input type="number" name="alpha[${index}].to" value="${anim.to}">
                                <label>Duration (ms):</label>
                                <input type="number" name="alpha[${index}].duration" value="${anim.duration}">
                                <label>Delay (ms):</label>
                                <input type="number" name="alpha[${index}].delay" value="${anim.delay}">
                                <label>Ease:</label>
                                <select name="alpha[${index}].ease">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${anim.ease === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                                <label>From End:</label>
                                <input type="checkbox" name="alpha[${index}].fromEnd" ${anim.fromEnd ? 'checked' : ''}>
                            </div>
                            <button type="button" class="remove-btn removeAlphaAnimation" data-slot="${slot}" data-index="${index}">Remove</button>
                        </details>
                    `).join('')}
                </div>
            </div>
        
            <div id="blur" class="tab-content">
                <div class="grid">
                    <label>Enabled:</label>
                    <input type="checkbox" name="blur.enabled" ${img.animations.blur[0]?.enabled ? 'checked' : ''}>
                    <button type="button" id="addBlurAnimation" data-slot="${slot}">+</button>
                </div>
                <div id="blurAnimations">
                    ${img.animations.blur.map((anim, index) => `
                        <details>
                            <summary>Blur ${index + 1}</summary>
                            <div class="grid">
                                <label>Enabled:</label>
                                <input type="checkbox" name="blur[${index}].enabled" ${anim.enabled ? 'checked' : ''}>
                                <label>From Strength:</label>
                                <input type="number" name="blur[${index}].fromStrength" value="${anim.fromStrength || 0}">
                                <label>To Strength:</label>
                                <input type="number" name="blur[${index}].toStrength" value="${anim.toStrength || 8}">
                                <label>From Blur X:</label>
                                <input type="number" name="blur[${index}].fromBlurX" value="${anim.fromBlurX || 0}">
                                <label>To Blur X:</label>
                                <input type="number" name="blur[${index}].toBlurX" value="${anim.toBlurX || 2}">
                                <label>From Blur Y:</label>
                                <input type="number" name="blur[${index}].fromBlurY" value="${anim.fromBlurY || 0}">
                                <label>To Blur Y:</label>
                                <input type="number" name="blur[${index}].toBlurY" value="${anim.toBlurY || 2}">
                                <label>Duration (ms):</label>
                                <input type="number" name="blur[${index}].duration" value="${anim.duration}">
                                <label>Delay (ms):</label>
                                <input type="number" name="blur[${index}].delay" value="${anim.delay}">
                                <label>Ease:</label>
                                <select name="blur[${index}].ease">
                                    ${easeOptions.map(ease => `<option value="${ease}" ${anim.ease === ease ? 'selected' : ''}>${ease}</option>`).join('')}
                                </select>
                            </div>
                            <button type="button" class="remove-btn removeBlurAnimation" data-slot="${slot}" data-index="${index}">Remove</button>
                        </details>
                    `).join('')}
                </div>
            </div>
        </div>
        `;
        
        const d = new Dialog({
            title: `Configure Animations - Image ${slot + 1}`,
            content: content,
            buttons: {
                apply: {
                    label: "Apply",
                    callback: (html) => {
                        // Update animations data
                        const animations = ['position', 'rotation', 'scale', 'alpha', 'blur'];
                        
                        animations.forEach(anim => {
                            if (!Array.isArray(img.animations[anim])) {
                                img.animations[anim] = [];
                            }
        
                            console.log(`Clearing existing ${anim} animations`, img.animations[anim]);
        
                            // Clear existing animations before updating
                            img.animations[anim] = [];
        
                            // Get all animation elements for this type and reconstruct animations array
                            html.find(`[name^="${anim}["]`).each(function() {
                                const match = $(this).attr('name').match(/\[(\d+)\]/);
                                if (match) {
                                    const index = parseInt(match[1]);
                                    console.log(`Found animation ${anim} at index ${index}`);
                                    if (!img.animations[anim][index]) {
                                        img.animations[anim][index] = {};
                                    }
        
                                    const prefix = `${anim}[${index}].`;
                                    const animation = img.animations[anim][index];
                                    
                                    // Common properties
                                    animation.enabled = html.find(`[name="${prefix}enabled"]`).prop('checked') || false;
                                    animation.duration = Number(html.find(`[name="${prefix}duration"]`).val()) || 1000;
                                    animation.delay = Number(html.find(`[name="${prefix}delay"]`).val()) || 0;
                                    animation.ease = html.find(`[name="${prefix}ease"]`).val() || 'linear';
                                    animation.fromEnd = html.find(`[name="${prefix}fromEnd"]`).prop('checked') || false;
        
                                    // Type-specific properties
                                    if (anim === 'position') {
                                        animation.moveToX = Number(html.find(`[name="${prefix}moveToX"]`).val()) || 0;
                                        animation.moveToY = Number(html.find(`[name="${prefix}moveToY"]`).val()) || 0;
                                        animation.gridUnits = html.find(`[name="${prefix}gridUnits"]`).prop('checked') || false;
                                        animation.fromEndX = html.find(`[name="${prefix}fromEndX"]`).prop('checked') || false;
                                        animation.fromEndY = html.find(`[name="${prefix}fromEndY"]`).prop('checked') || false;
                                        delete animation.fromEnd;
                                    } else if (anim === 'rotation') {
                                        animation.from = Number(html.find(`[name="${prefix}from"]`).val()) || 0;
                                        animation.to = Number(html.find(`[name="${prefix}to"]`).val()) || 360;
                                        animation.loop = html.find(`[name="${prefix}loop"]`).prop('checked') || false;
                                    } else if (anim === 'scale') {
                                        animation.fromX = Number(html.find(`[name="${prefix}fromX"]`).val()) || 1;
                                        animation.toX = Number(html.find(`[name="${prefix}toX"]`).val()) || 1;
                                        animation.fromY = Number(html.find(`[name="${prefix}fromY"]`).val()) || 1;
                                        animation.toY = Number(html.find(`[name="${prefix}toY"]`).val()) || 1;
                                    } else if (anim === 'alpha') {
                                        animation.from = Number(html.find(`[name="${prefix}from"]`).val()) || 1;
                                        animation.to = Number(html.find(`[name="${prefix}to"]`).val()) || 1;
                                    } else if (anim === 'blur') {
                                        console.log("Processing blur animation");
                                        console.log("Form fields found:", html.find(`[name^="${anim}["]`).length);
                                        console.log("fromStrength:", html.find(`[name="${prefix}fromStrength"]`).val());
                                        console.log("toStrength:", html.find(`[name="${prefix}toStrength"]`).val());
                                        console.log("fromBlurX:", html.find(`[name="${prefix}fromBlurX"]`).val());
                                        console.log("toBlurX:", html.find(`[name="${prefix}toBlurX"]`).val());
                                        console.log("fromBlurY:", html.find(`[name="${prefix}fromBlurY"]`).val());
                                        console.log("toBlurY:", html.find(`[name="${prefix}toBlurY"]`).val());
                                        console.log("quality:", html.find(`[name="${prefix}quality"]`).val());
                                        animation.fromStrength = Number(html.find(`[name="${prefix}fromStrength"]`).val()) || 0;
                                        animation.toStrength = Number(html.find(`[name="${prefix}toStrength"]`).val()) || 8;
                                        animation.fromBlurX = Number(html.find(`[name="${prefix}fromBlurX"]`).val()) || 0;
                                        animation.toBlurX = Number(html.find(`[name="${prefix}toBlurX"]`).val()) || 2;
                                        animation.fromBlurY = Number(html.find(`[name="${prefix}fromBlurY"]`).val()) || 0;
                                        animation.toBlurY = Number(html.find(`[name="${prefix}toBlurY"]`).val()) || 2;
                                        animation.quality = Number(html.find(`[name="${prefix}quality"]`).val()) || 4;
                                    } 
                                }
                            });
                        });
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            },
            render: (html) => {
                // Tab switching logic
                html.find('.anim-tab').on('click', function() {
                    const tab = $(this).data('tab');
                    html.find('.anim-tab').removeClass('active');
                    html.find('.tab-content').removeClass('active');
                    $(this).addClass('active');
                    html.find(`#${tab}`).addClass('active');
                });
            },
            close: (html) => {
                // Clean up event handlers when dialog closes
                $(document).off('click.animationDialog');
            },
            default: "apply"
        }, {
            height: "auto"
        });
        d.render(true, {
            id: "confanim"
        });
    }

    // Handle animation dialog button click
    $(document).off("click", ".configure-animation").on("click", ".configure-animation", function() {
        const slot = $(this).data("slot");
        openAnimationDialog(slot);
    });

    // Handle "On Token" checkbox changes for images
    $(document).off("change", ".image-on-token").on("change", ".image-on-token", function() {
        ensureimgDataIntegrity();
        const $this = $(this);
        const slot = parseInt($this.attr("data-slot"));
        const isChecked = $this.prop("checked");
        
        if (slot >= 0 && slot < nOfSlots) {
            imgData[slot].onToken = isChecked;
            const $imageControls = $(`.image-controls[data-slot="${slot}"]`);
            const $tokenImageControls = $(`.token-image-controls[data-slot="${slot}"]`);
            
            $imageControls.toggle(!isChecked);
            $tokenImageControls.toggle(isChecked);
            
            console.log(`Updated image slot ${slot} onToken:`, isChecked);
        }
    });

    // Initialize the image data array with default values
    let imgData = [];
    imgData = Array(nOfSlots).fill(null).map(() => ({
        file: "",
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 3000,
        delay: 0,
        moveToX: 0,
        moveToY: 0,
        move: 0,
        zIndex: 1,
        fadeInDuration: 500,
        fadeOutDuration: 500,
        mirrorX: false,
        mirrorY: false,
        onToken: false,
        size: {
            width: null,
            height: null,
            gridUnits: false
        },
        filters: {
            colorMatrix: {
                enabled: false,
                hue: 0,
                brightness: 1,
                contrast: 1,
                saturate: 0
            },
            glow: {
                enabled: false,
                distance: 10,
                outerStrength: 4,
                innerStrength: 0,
                color: 0xffffff,
                quality: 0.1,
                knockout: false
            },
            blur: {
                enabled: false,
                strength: 8,
                blur: 2,
                blurX: 2,
                blurY: 2,
                quality: 4,
                resolution: 1,
                kernelSize: 5
            }
        },
        animations: {
            position: [{
                enabled: true,
                moveToX: 0,
                moveToY: 0,
                duration: 1000,
                ease: "linear",
                delay: 0,
                gridUnits: false,
                fromEndX: false,
                fromEndY: false
            }],
            rotation: [{
                enabled: true,
                from: 0,
                to: 360,
                duration: 1000,
                ease: "linear",
                delay: 0,
                fromEnd: false,
                loop: false
            }],
            scale: [{
                enabled: true,
                fromX: 1,
                toX: 1,
                fromY: 1,
                toY: 1,
                duration: 1000,
                ease: "linear",
                delay: 0,
                fromEnd: false
            }],
            alpha: [{
                enabled: true,
                from: 1,
                to: 1,
                duration: 1000,
                ease: "linear",
                delay: 0,
                fromEnd: false
            }]
        },
        persist: false,
        attachToSource: false,
        stretchToTarget: {
            enabled: false,
            tiling: false
        },
        belowToken: false,
        attachOptions: {
            align: "center",
            edge: "on",
            bindVisibility: true,
            bindAlpha: true,
            followRotation: true,
            randomOffset: false,
            offset: { x: 0, y: 0 }
        }
    }));

    // Function to ensure imgData array is properly structured
    function ensureimgDataIntegrity() {
        if (!Array.isArray(imgData) || imgData.length !== nOfSlots) {
            console.log('Reinitializing imgData array');
            imgData = Array(nOfSlots).fill(null).map(() => ({
                file: "",
                x: 0,
                y: 0,
                scale: 1,
                opacity: 1,
                duration: 3000,
                delay: 0,
                moveToX: 0,
                moveToY: 0,
                move: 0,
                zIndex: 1,
                fadeInDuration: 500,
                fadeOutDuration: 500,
                mirrorX: false,
                mirrorY: false,
                onToken: false,
                size: {
                    width: null,
                    height: null,
                    gridUnits: false
                },
                filters: {
                    colorMatrix: {
                        enabled: false,
                        hue: 0,
                        brightness: 1,
                        contrast: 1,
                        saturate: 0
                    },
                    glow: {
                        enabled: false,
                        distance: 10,
                        outerStrength: 4,
                        innerStrength: 0,
                        color: 0xffffff,
                        quality: 0.1,
                        knockout: false
                    },
                    blur: {
                        enabled: false,
                        strength: 8,
                        blur: 2,
                        blurX: 2,
                        blurY: 2,
                        quality: 4,
                        resolution: 1,
                        kernelSize: 5
                    }
                },
                animations: {
                    position: [{
                        enabled: true,
                        moveToX: 0,
                        moveToY: 0,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        gridUnits: false,
                        fromEndX: false,
                        fromEndY: false
                    }],
                    rotation: [{
                        enabled: true,
                        from: 0,
                        to: 360,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        fromEnd: false,
                        loop: false
                    }],
                    scale: [{
                        enabled: true,
                        fromX: 1,
                        toX: 1,
                        fromY: 1,
                        toY: 1,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        fromEnd: false
                    }],
                    alpha: [{
                        enabled: true,
                        from: 1,
                        to: 1,
                        duration: 1000,
                        ease: "linear",
                        delay: 0,
                        fromEnd: false
                    }]
                },
                persist: false,
                attachToSource: false,
                stretchToTarget: {
                    enabled: false,
                    tiling: false
                },
                belowToken: false,
                attachOptions: {
                    align: "center",
                    edge: "on",
                    bindVisibility: true,
                    bindAlpha: true,
                    followRotation: true,
                    randomOffset: false,
                    offset: { x: 0, y: 0 }
                }
            }));
        }
        
        // Ensure each slot has proper structure
        for (let i = 0; i < nOfSlots; i++) {
            if (!imgData[i]) {
                imgData[i] = {
                    file: "",
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    duration: 3000,
                    delay: 0,
                    moveToX: 0,
                    moveToY: 0,
                    move: 0,
                    zIndex: 1,
                    fadeInDuration: 500,
                    fadeOutDuration: 500,
                    mirrorX: false,
                    mirrorY: false,
                    onToken: false,
                    size: {
                        width: null,
                        height: null,
                        gridUnits: false
                    },
                    filters: {
                        colorMatrix: {
                            enabled: false,
                            hue: 0,
                            brightness: 1,
                            contrast: 1,
                            saturate: 0
                        },
                        glow: {
                            enabled: false,
                            distance: 10,
                            outerStrength: 4,
                            innerStrength: 0,
                            color: 0xffffff,
                            quality: 0.1,
                            knockout: false
                        },
                        blur: {
                            enabled: false,
                            strength: 8,
                            blur: 2,
                            blurX: 2,
                            blurY: 2,
                            quality: 4,
                            resolution: 1,
                            kernelSize: 5
                        }
                    },
                    animations: {
                        position: [{
                            enabled: true,
                            moveToX: 0,
                            moveToY: 0,
                            duration: 1000,
                            ease: "linear",
                            delay: 0,
                            gridUnits: false,
                            fromEndX: false,
                            fromEndY: false
                        }],
                        rotation: [{
                            enabled: true,
                            from: 0,
                            to: 360,
                            duration: 1000,
                            ease: "linear",
                            delay: 0,
                            fromEnd: false,
                            loop: false
                        }],
                        scale: [{
                            enabled: true,
                            fromX: 1,
                            toX: 1,
                            fromY: 1,
                            toY: 1,
                            duration: 1000,
                            ease: "linear",
                            delay: 0,
                            fromEnd: false
                        }],
                        alpha: [{
                            enabled: true,
                            from: 1,
                            to: 1,
                            duration: 1000,
                            ease: "linear",
                            delay: 0,
                            fromEnd: false
                        }]
                    },
                    persist: false,
                    attachToSource: false,
                    stretchToTarget: {
                        enabled: false,
                        tiling: false
                    },
                    belowToken: false,
                    attachOptions: {
                        align: "center",
                        edge: "on",
                        bindVisibility: true,
                        bindAlpha: true,
                        followRotation: true,
                        randomOffset: false,
                        offset: { x: 0, y: 0 }
                    }
                };
            }
            // Ensure attachOptions exists
            if (!imgData[i].attachOptions) {
                imgData[i].attachOptions = {
                    align: "center",
                    edge: "on",
                    bindVisibility: true,
                    bindAlpha: true,
                    followRotation: true,
                    randomOffset: false,
                    offset: { x: 0, y: 0 }
                };
            } else if (!imgData[i].animations) {
                imgData[i].animations = { position: [], scale: [], alpha: [], rotation: [] };
            }
        }
        console.log('Current imgData array:', JSON.parse(JSON.stringify(imgData)));
    }

    // Function to ensure textData array is properly structured
    function ensureTextDataIntegrity() {
        if (!window.textData || !Array.isArray(window.textData) || window.textData.length !== nOfSlots) {
            window.textData = Array(nOfSlots).fill(null).map(() => ({
                text: "",
                x: 0,
                y: 0,
                duration: 3000,
                delay: 0,
                style: defaultTextStyle,
                moveXBy: 0,
                moveYBy: 0,
                movementDuration: 1000,
                movementEase: "linear",
                onToken: false,
                persist: false,
                attach: false,
                attachOptions: {
                    align: "center",
                    edge: "on",
                    bindVisibility: true,
                    bindAlpha: true,
                    followRotation: true,
                    randomOffset: false,
                    offset: { x: 0, y: 0 }
                }
            }));
        }
        
        // Ensure each slot has proper structure
        for (let i = 0; i < nOfSlots; i++) {
            if (!textData[i]) {
                textData[i] = {
                    text: "",
                    x: 0,
                    y: 0,
                    duration: 3000,
                    delay: 0,
                    style: defaultTextStyle,
                    moveXBy: 0,
                    moveYBy: 0,
                    movementDuration: 1000,
                    movementEase: "linear",
                    onToken: false,
                    persist: false,
                    attach: false,
                    attachOptions: {
                        align: "center",
                        edge: "on",
                        bindVisibility: true,
                        bindAlpha: true,
                        followRotation: true,
                        randomOffset: false,
                        offset: { x: 0, y: 0 }
                    }
                };
            }
            // Ensure attachOptions exists
            if (!textData[i].attachOptions) {
                textData[i].attachOptions = {
                    align: "center",
                    edge: "on",
                    bindVisibility: true,
                    bindAlpha: true,
                    followRotation: true,
                    randomOffset: false,
                    offset: { x: 0, y: 0 }
                };
            }
        }
        console.log('Current textData array:', JSON.parse(JSON.stringify(window.textData)));
    }

    // Function to ensure soundData array is properly structured
    function ensuresoundDataIntegrity() {
        if (!window.soundData || !Array.isArray(window.soundData)) {
            window.soundData = Array(nOfSlots).fill(null).map(() => ({
                file: "",
                delay: 0,
                duration: 0,
                fadeIn: 500,
                fadeOut: 500,
                timeStart: 0,
                timeEnd: 0,
                volume: 0.8
            }));
        }
        
        // Ensure each slot has proper structure
        for (let i = 0; i < nOfSlots; i++) {
            if (!soundData[i]) {
                soundData[i] = {
                    file: "",
                    delay: 0,
                    duration: 0,
                    fadeIn: 500,
                    fadeOut: 500,
                    timeStart: 0,
                    timeEnd: 0,
                    volume: 0.8
                };
            }
        }
        console.log('Current soundData array:', JSON.parse(JSON.stringify(window.soundData)));
    }

    // Initialize the text data array with default values
    window.textData = Array(nOfSlots).fill(null).map(() => ({
        text: "",
        x: 0,
        y: 0,
        duration: 3000,
        delay: 0,
        style: defaultTextStyle,
        moveXBy: 0,
        moveYBy: 0,
        movementDuration: 1000,
        movementEase: "linear",
        onToken: false,
        persist: false,
        attach: false,
        attachOptions: {
            align: "center",
            edge: "on",
            bindVisibility: true,
            bindAlpha: true,
            followRotation: true,
            randomOffset: false,
            offset: { x: 0, y: 0 }
        }
    }));

    // Initialize the sound data array with default values
    window.soundData = Array(nOfSlots).fill(null).map(() => ({
        file: "",
        delay: 0
    }));

    // Function to open the Attach Options dialog
    function openAttachOptionsDialog(slot, type) {
        const data = type === 'text' ? textData[slot] : imgData[slot];
        const options = data.attachOptions || {
            align: "center",
            edge: "on",
            bindVisibility: true,
            bindAlpha: true,
            followRotation: true,
            randomOffset: false,
            offset: { x: 0, y: 0 }
        };

        const alignOptions = [
            'top-left', 'top', 'top-right',
            'left', 'center', 'right',
            'bottom-left', 'bottom', 'bottom-right'
        ];

        const edgeOptions = ['inner', 'on', 'outer'];

        const content = `
        <style>
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 5px 0; }
            .grid label { text-align: right; padding-right: 5px; }
            .grid input, .grid select { width: 100%; }
        </style>
        
        <div class="grid">
            <label>Alignment:</label>
            <select name="align">
                ${alignOptions.map(opt => `<option value="${opt}" ${options.align === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>

            <label>Edge:</label>
            <select name="edge">
                ${edgeOptions.map(opt => `<option value="${opt}" ${options.edge === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>

            <label>Bind Visibility:</label>
            <input type="checkbox" name="bindVisibility" ${options.bindVisibility ? 'checked' : ''}>

            <label>Bind Alpha:</label>
            <input type="checkbox" name="bindAlpha" ${options.bindAlpha ? 'checked' : ''}>

            <label>Follow Rotation:</label>
            <input type="checkbox" name="followRotation" ${options.followRotation ? 'checked' : ''}>

            <label>Random Offset:</label>
            <input type="number" name="randomOffset" value="${options.randomOffset === false ? 0 : options.randomOffset}" min="0" step="0.1">

            <label>Offset X:</label>
            <input type="number" name="offsetX" value="${options.offset.x}" step="1">

            <label>Offset Y:</label>
            <input type="number" name="offsetY" value="${options.offset.y}" step="1">
        </div>`;

        new Dialog({
            title: "Attach To Options",
            content: content,
            buttons: {
                save: {
                    label: "Save",
                    callback: (html) => {
                        const newOptions = {
                            align: html.find('[name="align"]').val(),
                            edge: html.find('[name="edge"]').val(),
                            bindVisibility: html.find('[name="bindVisibility"]').prop('checked'),
                            bindAlpha: html.find('[name="bindAlpha"]').prop('checked'),
                            followRotation: html.find('[name="followRotation"]').prop('checked'),
                            randomOffset: Number(html.find('[name="randomOffset"]').val()) || false,
                            offset: {
                                x: Number(html.find('[name="offsetX"]').val()),
                                y: Number(html.find('[name="offsetY"]').val())
                            }
                        };

                        if (type === 'text') {
                            textData[slot].attachOptions = newOptions;
                        } else {
                            imgData[slot].attachOptions = newOptions;
                        }
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            },
            default: "save",
            resizable: true,
            height: "auto"
        }).render(true);
    }

    $(document).ready(function() {
        // Add buttons and handlers for text slots
        for (let i = 0; i < nOfSlots; i++) {
            const attachOptionsBtn = $(`<button class="attach-options-btn" data-slot="${i}" style="display: none; margin-left: 5px;">Attach Options</button>`);
            $(`.text-attach[data-slot="${i}"]`).after(attachOptionsBtn);
            
            // Show/hide button based on attach checkbox
            $(`.text-attach[data-slot="${i}"]`).on('change', function() {
                const checked = $(this).prop('checked');
                $(`.attach-options-btn[data-slot="${i}"]`).toggle(checked);
                textData[i].attach = checked;
            });
            
            // Open dialog when button is clicked
            attachOptionsBtn.on('click', function() {
                openAttachOptionsDialog(i, 'text');
            });

            // Image attach options button
            const imageAttachOptionsBtn = $(`<button class="attach-options-btnimage" data-slot="${i}" style="display: none; margin-left: 5px;">Attach Options</button>`);
            $(`.image-attach-source[data-slot="${i}"]`).after(imageAttachOptionsBtn);
            
            
            // Open dialog when image button is clicked
            $(`.attach-options-btnimage[data-slot="${i}"]`).on('click', function() {
                openAttachOptionsDialog(i, 'image');
            });
        }
    });

    // Handle text persist checkbox changes
    $(document).off("change", ".text-persist").on("change", ".text-persist", function() {
        ensureTextDataIntegrity();
        const $this = $(this);
        const slot = parseInt($this.attr("data-slot"));
        const isChecked = $this.prop("checked");
        
        if (slot >= 0 && slot < nOfSlots) {
            window.textData[slot].persist = isChecked;
            console.log(`Updated text slot ${slot} persist:`, isChecked);
        }
    });

    function ensureImgDataInitialization(slot) {
        if (!imgData[slot]) {
            imgData[slot] = { animations: { position: [], scale: [], alpha: [], rotation: [] } };
        } else if (!imgData[slot].animations) {
            imgData[slot].animations = { position: [], scale: [], alpha: [], rotation: [] };
        }
    }

    function removeAnimation(slot, type, index) {
        return function() {
            console.log(`Removing ${type} animation at index ${index} for slot ${slot}`);
            
            ensureImgDataInitialization(slot);
            const img = imgData[slot];
            
            if (!img.animations || !img.animations[type]) {
                console.error(`Invalid animation structure for slot ${slot}, type ${type}`);
                return;
            }
            
            if (index < 0 || index >= img.animations[type].length) {
                console.error(`Invalid animation index ${index} for slot ${slot}, type ${type}`);
                return;
            }
            
            // Remove the animation from the data structure
            img.animations[type].splice(index, 1);
            
            // Find and remove the details element
            const $container = $(`#${type}Animations`);
            const $details = $container.find("details").eq(index);
            
            if ($details.length) {
                $details.remove();
                
                // Update the numbering for remaining animations
                $container.find("details").each(function(i) {
                    const $detail = $(this);
                    $detail.find("summary").text(`${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`);
                    
                    // Update input names and data-index
                    $detail.find("input, select").each(function() {
                        const name = $(this).attr("name");
                        if (name) {
                            $(this).attr("name", name.replace(/\[\d+\]/, `[${i}]`));
                        }
                    });
                    $detail.find(".remove-btn").attr("data-index", i);
                });
                
                console.log(`Successfully removed ${type} animation at index ${index}`);
            } else {
                console.error(`Could not find details element at index ${index}`);
            }
        };
    }
    function generateAnimationHTML(type, index, slot) {
        const typeSpecificFields = (() => {
            switch (type) {
                case "position":
                    return `
                        <label>Move X by:</label>
                        <input type="number" name="${type}[${index}].moveToX" value="0">
                        <label>Move Y by:</label>
                        <input type="number" name="${type}[${index}].moveToY" value="0">
                        <label>Grid Units:</label>
                        <input type="checkbox" name="${type}[${index}].gridUnits">
                        <label>From End X:</label>
                        <input type="checkbox" name="${type}[${index}].fromEndX">
                        <label>From End Y:</label>
                        <input type="checkbox" name="${type}[${index}].fromEndY">`;
                case "rotation":
                    return `
                        <label>Loop Forever:</label>
                        <input type="checkbox" name="${type}[${index}].loop">
                        <label>From:</label>
                        <input type="number" name="${type}[${index}].from" value="0">
                        <label>To:</label>
                        <input type="number" name="${type}[${index}].to" value="360">`;
                case "scale":
                    return `
                        <label>From X:</label>
                        <input type="number" name="${type}[${index}].fromX" value="1">
                        <label>To X:</label>
                        <input type="number" name="${type}[${index}].toX" value="1">
                        <label>From Y:</label>
                        <input type="number" name="${type}[${index}].fromY" value="1">
                        <label>To Y:</label>
                        <input type="number" name="${type}[${index}].toY" value="1">`;
                case "blur":
                    return `
                        <label>From Strength:</label>
                        <input type="number" name="${type}[${index}].fromStrength" value="0">
                        <label>To Strength:</label>
                        <input type="number" name="${type}[${index}].toStrength" value="8">
                        <label>From Blur X:</label>
                        <input type="number" name="${type}[${index}].fromBlurX" value="0">
                        <label>To Blur X:</label>
                        <input type="number" name="${type}[${index}].toBlurX" value="2">
                        <label>From Blur Y:</label>
                        <input type="number" name="${type}[${index}].fromBlurY" value="0">
                        <label>To Blur Y:</label>
                        <input type="number" name="${type}[${index}].toBlurY" value="2">
                        <label>Quality:</label>
                        <input type="number" name="${type}[${index}].quality" value="4">`;
                case "alpha":
                    return `
                        <label>From:</label>
                        <input type="number" name="${type}[${index}].from" value="1">
                        <label>To:</label>
                        <input type="number" name="${type}[${index}].to" value="1">`;
                default:
                    return '';
            }
        })();

        const fromEndField = type !== 'position' ? `
                    <label>From End:</label>
                    <input type="checkbox" name="${type}[${index}].fromEnd">` : '';

        return `
            <details>
                <summary>${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}</summary>
                <div class="grid">
                    <label>Enabled:</label>
                    <input type="checkbox" name="${type}[${index}].enabled" checked>
                    ${typeSpecificFields}
                    <label>Duration (ms):</label>
                    <input type="number" name="${type}[${index}].duration" value="1000">
                    <label>Delay (ms):</label>
                    <input type="number" name="${type}[${index}].delay" value="0">
                    <label>Ease:</label>
                    <select name="${type}[${index}].ease">
                        ${easeOptions.map(ease => `<option value="${ease}">${ease}</option>`).join('')}
                    </select>
                    ${fromEndField}
                </div>
                <button type="button" class="remove-btn remove${type.charAt(0).toUpperCase() + type.slice(1)}Animation" data-slot="${slot}" data-index="${index}">Remove</button>
            </details>
        `;
    }
    function addAnimation(slot, animationType) {
        return function() {
            console.log(`Adding ${animationType} animation for slot ${slot}`);
            ensureImgDataInitialization(slot);
            const img = imgData[slot];
            
            // Initialize animations array if it doesn't exist
            if (!img.animations[animationType]) {
                img.animations[animationType] = [];
            }
            
            // Find the next available index
            let maxIndex = -1;
            img.animations[animationType].forEach((anim, index) => {
                if (index > maxIndex) maxIndex = index;
            });
            const newIndex = maxIndex + 1;

            const defaultAnimation = {
                enabled: true,
                duration: 1000,
                ease: "linear",
                delay: 0,
                fromEnd: false
            };

            switch (animationType) {
                case "position":
                    Object.assign(defaultAnimation, {
                        moveToX: 0,
                        moveToY: 0,
                        gridUnits: false,
                        fromEndX: false,
                        fromEndY: false
                    });
                    break;
                case "rotation":
                    Object.assign(defaultAnimation, {
                        from: 0,
                        to: 360,
                        loop: false
                    });
                    break;
                case "scale":
                    Object.assign(defaultAnimation, {
                        fromX: 1,
                        toX: 1,
                        fromY: 1,
                        toY: 1
                    });
                    break;
                case "alpha":
                    Object.assign(defaultAnimation, {
                        from: 1,
                        to: 1
                    });
                    break;
                case "blur":
                    Object.assign(defaultAnimation, {
                        strength: 8,
                        blur: 2,
                        blurX: 2,
                        blurY: 2,
                        quality: 4
                    });
                    break;
            }

            img.animations[animationType].push(defaultAnimation);
            
            const animationHTML = generateAnimationHTML(animationType, newIndex, slot);
            $(`#${animationType}Animations`).append(animationHTML);
            console.log(`Added new ${animationType} animation at index ${newIndex}`);
        };
    }
    // Use event delegation for dynamically created elements

    $(document).off("click.DMKalIsAwesome_addPositionAnimation").on("click.DMKalIsAwesome_addPositionAnimation", "#addPositionAnimation", function() {
        const slot = $(this).data("slot");
        addAnimation(slot, "position")();
    });

    $(document).off("click.DMKalIsAwesome_addScaleAnimation").on("click.DMKalIsAwesome_addScaleAnimation", "#addScaleAnimation", function() {
        const slot = $(this).data("slot");
        addAnimation(slot, "scale")();
    });

    $(document).off("click.DMKalIsAwesome_addAlphaAnimation").on("click.DMKalIsAwesome_addAlphaAnimation", "#addAlphaAnimation", function() {
        const slot = $(this).data("slot");
        addAnimation(slot, "alpha")();
    });

    $(document).off("click.DMKalIsAwesome_addRotationAnimation").on("click.DMKalIsAwesome_addRotationAnimation", "#addRotationAnimation", function() {
        const slot = $(this).data("slot");
        addAnimation(slot, "rotation")();
    });

    $(document).off("click.DMKalIsAwesome_addBlurAnimation").on("click.DMKalIsAwesome_addBlurAnimation", "#addBlurAnimation", function() {
        const slot = $(this).data("slot");
        addAnimation(slot, "blur")();
    });

    // Use delegation for remove buttons
    $(document).off("click.DMKalIsAwesome_removeButtons").on("click.DMKalIsAwesome_removeButtons", ".removePositionAnimation, .removeScaleAnimation, .removeAlphaAnimation, .removeRotationAnimation, .removeBlurAnimation", function() {
        const slot = $(this).data("slot");
        const index = $(this).data("index");
        const match = this.className.match(/remove(\w+)Animation/);
        
        if (!match || !match[1]) {
            console.error("Could not extract animation type from class:", this.className);
            return;
        }
        
        const type = match[1].toLowerCase();
        console.log(`Removing animation of type: ${type} at index: ${index} for slot: ${slot}`);
        removeAnimation(slot, type, index)();
    });


    // Function to preview a single image animation


    function resetImgData() {
        if (typeof img !== 'undefined') {
            img = null;
        }
        if (typeof newIndex !== 'undefined') {
            newIndex = null;
        }
        if (typeof slot !== 'undefined') {
            slot = null;
        }
        if (typeof index !== 'undefined') {
            index = null;
        }
        if (typeof img !== 'undefined') {
            img = null;
        }

        imgData = Array(nOfSlots).fill(null).map(() => ({
            file: "",
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 3000,
            delay: 0,
            moveToX: 0,
            moveToY: 0,
            move: 0,
            zIndex: 1,
            fadeInDuration: 500,
            fadeOutDuration: 500,
            mirrorX: false,
            mirrorY: false,
            onToken: false,
            size: {
                width: null,
                height: null,
                gridUnits: false
            },
            filters: {
                colorMatrix: {
                    enabled: false,
                    hue: 0,
                    brightness: 1,
                    contrast: 1,
                    saturate: 0
                },
                glow: {
                    enabled: false,
                    distance: 10,
                    outerStrength: 4,
                    innerStrength: 0,
                    color: 0xffffff,
                    quality: 0.1,
                    knockout: false
                },
                blur: {
                    enabled: false,
                    strength: 8,
                    blur: 2,
                    blurX: 2,
                    blurY: 2,
                    quality: 4,
                    resolution: 1,
                    kernelSize: 5
                }
            },
            animations: {
                position: [],
                rotation: [],
                scale: [],
                alpha: [],
                blur: []
            }
        }));
    }

    // Call resetImgData when the macro is opened
    $(document).ready(function() {
        resetImgData();
    });

}

Hooks.once("sequencerReady", () => {
    Hooks.on("getSceneControlButtons", (controls) => {
        if (!game.settings.get("sequencer", "showSidebarTools")) return;
        const sequencerLayer = controls.find(layer => layer.name === "sequencer");
        sequencerLayer.tools.push({
            icon: "fa-solid fa-sparkles",
            name: "animator",
            title: "Animator",
            button: true,
            visible: true,
            onClick: openDialog,
        })
    })
})

