define([
    'libs/EventEmitter.min.js',
    'js/pixi-mesh/ProjectPlane'
], function(EventEmitter, ProjectPlane) {

    function PIXIProjectionRenderer(numSteps) {
        var events = new EventEmitter();
        var projectPlane = new ProjectPlane(numSteps, numSteps);

        projectPlane.setFrontFaceCulling(true);

        var app = new PIXI.Application({
            autoStart: false,
            clearBeforeRender: true,
            width: 256,
            height: 256,
            antialias: true,
            transparent: true,
            resolution: 1,
        });
        app.renderer.autoResize = true;
        app.stage.addChild(projectPlane);

        function setRenderSize(width, height) {
            app.renderer.resize(width, height);
        }

        function setTextureSize(width, height) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0,0, width, height);
            projectPlane.setTexture(PIXI.Texture.from(canvas));
        }

        function setTPSPositions(tpsPositions, sProj) {
            projectPlane.setTPSPositions(tpsPositions, sProj);
        }

        function generateVerts(scale, tx, ty) {
            projectPlane.generateVerts(scale, tx, ty);
        }

        function render() {
            app.renderer.render(app.stage);
        }

        function renderToCanvas(canvas) {
            var temp = app.renderer.view;
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0,0, canvas.width, canvas.height);
            ctx.drawImage(temp, 0, 0);
        }

        function getAlphaMap() {
            //var pixels = app.renderer.plugins.extract.pixels();
            var canvas = app.renderer.view;
            var tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = canvas.width;
            tmpCanvas.height = canvas.height;
            var context = tmpCanvas.getContext("2d");
            context.drawImage(canvas, 0, 0);
            var pixels = context.getImageData(0,0, canvas.width, canvas.height).data;

            var alpha = new Uint8ClampedArray(app.renderer.width * app.renderer.height);

            for(var i = 0; i < alpha.length; i++) {
                alpha[i] = pixels[i * 4 + 3];
            }
            return alpha;
        }

        /*
        // webgl readpixels seems broken on ubuntu 18 with nvidia gtx970
        // gl.ALPHA produces error format and type not matching
        // gl.RGBA reads some strange values
        // TODO: bugreport
        function getAlphaMap() {
            //var pixels = app.renderer.plugins.extract.pixels();
            console.time('readPixels');

            var gl = app.renderer.view.getContext('webgl');

            var pixels = new Uint8Array(app.renderer.width * app.renderer.height * 4);
            var alphaPixels = new Uint8Array(app.renderer.width * app.renderer.height);
            gl.readPixels(0,0, app.renderer.width, app.renderer.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            for(var i = 0; i < alphaPixels.length; i++) {
                alphaPixels[i] = pixels[i * 4 + 3];
            }

            console.timeEnd('readPixels');
            return alphaPixels;
        }
        */

        return {
            events,
            setRenderSize,
            setTextureSize,
            setTPSPositions,
            generateVerts,
            render,
            renderToCanvas,
            getAlphaMap
        }
    }

    return PIXIProjectionRenderer;
});
