define([], function() {

    class MessageQueue {

        constructor(queues) {
            this.queues = [];
            this.workersBusy = 0;
            for(var i = 0; i < queues; i++) {
                this.queues.push([]);
            }
        }

        generateWorkers(workerurl, num, loadedCB) {
            var _this = this;
            var workers = [];
            for(var i = 0; i < num; i++) {
                this.workersBusy++;
                var worker = new Worker(workerurl);
                var listener = function(e) {
                    _this.workersBusy--;
                    var msg = e.data;
                    switch(msg.cmd) {
                        case 'worker_loaded':
                            if(_this.workersBusy === 0) {
                                if(loadedCB) {
                                    loadedCB();
                                }
                            }
                        break;
                    }
                };
                worker.addEventListener("message", listener);
                workers.push(worker);
            }
            return workers;
        }

        queue(worker, queue, message) {
            this.queues[queue].push({worker, message});
        }

        clear(queue) {
            if(queue === undefined) {
                for(var i = 0; i < this.queues.length; i++) {
                    this.queues[i] = [];
                }
            } else {
                this.queues[queue] = [];
            }
        }

        processQueue(queue) {
            //console.time('Post Message Queue #' + queue);
            for(var i in this.queues[queue]) {
                var item = this.queues[queue][i];
                this.workersBusy++;
                item.worker.postMessage(item.message);
            }
            this.clear(queue);
            //console.timeEnd('Post Message Queue #' + queue);
        }
    }

    function TPSVisProcessor(workerurl = 'js/TPSVisualizerWorker.js') {
        var con = self.navigator.hardwareConcurrency;

        var workers = [];
        var listeners = [];
        var workerLoaded = 0;
        var loadedCB = undefined;
        var passQueue = new MessageQueue(2);

        var workers = passQueue.generateWorkers(workerurl, con, function() {
            passQueue.processQueue(0);
        });

        var canvas, ctx, cw, ch, hslice, values;
        var vMax, vMin, vSumPos, vSumNeg, controlPoints, stencilControlPoints, bitMask, baseAlpha, meanThick, zeroThick, visType, overlap, stencilMap;
        var processId = 0;

        function setSize(width, height) {
            if(!canvas || canvas.width !== width || canvas.height !== height) {
                canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
            }
            ctx = canvas.getContext('2d');
            cw = canvas.width;
            ch = canvas.height;
            values = new Float32Array(width * height);
            hslice = Math.floor(ch / con);
        }

        function setControlPoints(points1, points2) {
            controlPoints = points1;
            stencilControlPoints = points2;
        }

        function setBitMask(mask) {
            bitMask = mask;
        }

        function setOverlap(v) {
            overlap = v;
        }


        function setBaseAlpha(alpha) {
            baseAlpha = alpha;
        }

        function setVisType(type) {
            visType = type;
        }

        function setThickness(mean, zero) {
            meanThick = mean;
            zeroThick = zero;
        }

        function setStencilMap(map) {
            stencilMap = map;
        }

        function process(pass) {

            var promise = new Promise((resolve, reject) => {
                // reset
                if(pass === 0) {
                    vMin = Infinity;
                    vMax = -Infinity;
                    vSumPos = 0;
                    vSumNeg = 0;
                    processId++;
                    passQueue.clear();
                }
                console.time('pass' + pass);

                for(var i = 0; i < con; i++) {
                    var sY = hslice * i;
                    var h = 0;
                    if(i < (con - 1)) {
                        h = hslice;
                    } else {
                        h = ch - hslice * i;
                    }

                    var worker = workers[i];
                    var listener = listeners[i];
                    if(listener) {
                        worker.removeEventListener("message", listener);
                    }
                    var listener = (function(worker, i, sY, h) {
                        return function(e) {
                            var msg = e.data;
                            switch(msg.cmd) {
                                case 'resultPass1':
                                    if(msg.id === processId) {
                                        vSumPos+=msg.vSumPos;
                                        vSumNeg+=msg.vSumNeg;
                                        vMax=Math.max(vMax, msg.vMax);
                                        vMin=Math.min(vMin, msg.vMin);

                                        values.set(msg.values, sY * cw);
                                        // pass 1 finished
                                        if(passQueue.workersBusy === 0) {
                                            // quick'n'dirty update aggregated values in queued jobs
                                            for(var i in passQueue.queues[1]) {
                                                var item = passQueue.queues[1][i];
                                                item.message.vSumPos = vSumPos;
                                                item.message.vSumNeg = vSumNeg;
                                                item.message.vMax = vMax;
                                                item.message.vMin = vMin;
                                            }
                                            console.timeEnd('pass' + pass);
                                            passQueue.processQueue(1);
                                            resolve({values, vSumPos, vSumNeg, vMin, vMax});
                                        }
                                    } else if(passQueue.workersBusy === 0) {
                                        passQueue.processQueue(0);
                                    }
                                    break;
                                case 'resultPass2':
                                    if(msg.id === processId) {
                                        var imgArray = new Uint8ClampedArray(msg.image);
                                        var iData = new ImageData(imgArray, cw, h);
                                        ctx.putImageData(iData, 0, sY);
                                        if(passQueue.workersBusy === 0) {
                                            console.timeEnd('pass' + pass);
                                            resolve(canvas);
                                        }
                                    }
                                    break;
                            }
                        };
                    })(worker, i, sY, h);
                    listeners[i] = listener;
                    worker.addEventListener("message", listener);

                    var message = (pass === 0) ?
                        {cmd: 'startPass1', controlPoints, stencilControlPoints, type: 1, sX: 0, w: cw, sY, h, id: processId} :
                        {cmd: 'startPass2', vMin, vMax, vSumPos, vSumNeg, cw, ch, bitMask, baseAlpha, meanThick, zeroThick, visType, overlap, stencilMap, id: processId};

                    passQueue.queue(worker, pass, message);
                }

                if(passQueue.workersBusy === 0) {
                    passQueue.processQueue(pass);
                }
            });
            return promise;
        }

        return { process, setSize, setControlPoints, setBitMask, setBaseAlpha, setVisType, setThickness, setOverlap, setStencilMap };
    }

    return TPSVisProcessor;
});
