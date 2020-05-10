self.importScripts('../libs/requirejs/require.js');
//self.importScripts('../libs/ThinPlateSplineJS/js/tps.js');

requirejs.config({
    //Lib path
    baseUrl: '../',
    //waitSeconds: 20
});

require(['js/TPSVisualizerOff'], function(TPSVisualizerOff) {

    var vis;

    self.onmessage = (e) => {
        var msg = e.data;
        if( msg.cmd === 'startPass1') {
            vis = TPSVisualizerOff(msg.controlPoints, msg.stencilControlPoints, msg.sX, msg.sY, msg.w, msg.h, msg.type);
            var res = vis.pass1();
            self.postMessage({cmd:'resultPass1', values: res.values, vMin: res.vMin, vMax: res.vMax, vSumPos: res.vSumPos, vSumNeg: res.vSumNeg, time: res.time, id: msg.id});
        }
        if( msg.cmd === 'startPass2') {
            //console.log('zerothink:',msg.zeroThick);
            var res = vis.pass2(msg.vMin, msg.vMax, msg.vSumPos, msg.vSumNeg, msg.cw, msg.ch, msg.bitMask, msg.visType, msg.meanThick, msg.zeroThick, msg.overlap, msg.stencilMap);
            self.postMessage({cmd:'resultPass2', image: res.image, time: res.time, id: msg.id}, [res.image]);
        }
    }

    self.postMessage({cmd:'worker_loaded'});
});
