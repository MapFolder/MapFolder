define(['./imageContainer',
'./imageContainerSelect',
'./TPSVisProcessor',
'./LeafletPixiMapModule',
'./LeafletImageMapModule',
'./PIXIProjectionRenderer',
'./AnnotationEditor',
'./ContourModule',
'./MeshCollision',
'./Options',
'd3',
'libs/rbush/rbush',
'./utils'], function(imageContainer,
  imageContainerSelect,
  TPSVisProcessor,
  LeafletPixiMap,
  LeafletImageMapModule,
  PIXIProjectionRenderer,
  AnnotationEditor,
  ContourModule,
  MeshCollision,
  options,
  d3,
  rbush,
  utils) {

    var visProcessor = TPSVisProcessor();
    var projectionMap = LeafletPixiMap(200);
    var visMap = LeafletImageMapModule();
    var stencilProjector = PIXIProjectionRenderer(200);

    var pointerWidth = 11;

    function whiteCanvas(canvas) {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0, canvas.width, canvas.height);
    }

    function updateProjectedImage(vnode) {
        projectionMap.setRenderCP(vnode.state.renderCP);
        projectionMap.setAlpha(vnode.state.alphaProj);
        projectionMap.updateMap();
        return Promise.resolve();
    }

    function drawVis(vnode, projCanvas, uC) {
      visProcessor.setBitMask(vnode.state.bitMask);
      visProcessor.setOverlap(vnode.state.overlap);
      visProcessor.setVisType(vnode.state.visType);
      //visProcessor.setBaseAlpha(vnode.state.alphaVis * 255);
      visProcessor.setThickness(vnode.state.meanThick, vnode.state.zeroThick);
      // start second pass
      return visProcessor.process(1)
          .then((canvas) => {
              whiteCanvas(projCanvas);
              var ctx = projCanvas.getContext('2d');
              ctx.drawImage(vnode.attrs.dataSet.img, 0, 0, vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);
              ctx.drawImage(canvas, 0, 0);
              return ctx;
          });
    }

    function updateCanvasVis(vnode) {
        return drawVis(vnode, document.getElementById('canvasVis'))
        .then(function() {
            var canvas = document.getElementById('canvasVis');
            visMap.setCanvas(canvas);
            visMap.setCtrlPoints(vnode.state.projPoints);
            visMap.setRenderCP(vnode.state.renderCP);
            visMap.updateMap();
        });
    }

    function drawAll(vnode) {
      return updateCanvasVis(vnode)
        .then(() => {
          return updateProjectedImage(vnode);
        });
    }

    function createPointer(pW) {
      var half = Math.floor(pW / 2);
      var pointer = document.createElement('canvas');
      pointer.width = pW,
      pointer.height = pW;
      var ctx = pointer.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, half - 2, pW, 5);
      ctx.fillRect(half - 2, 0, 5, pW);
      ctx.fillStyle = '#000';
      ctx.fillRect(1, half - 1, pW - 2, 3);
      ctx.fillRect(half - 1, 1, 3, pW - 2);
      return pointer;
    }

    function projectCanvasCoord(tps, projection, x, y, index, type, rtree) {
        if(index === 1) {
            if(type === 1) {
              //var trans = projection([x, y]);
              //XXX: Use a raw mercator projection here, with translate [0,0] and scale 1
              //     We need this as d3 mercator is wrapping the output space if lng is exceeding 180° which we do not want
              var xrad = x * Math.PI / 180;
              var yrad = y * Math.PI / 180;
              var trans = [xrad, -Math.log(Math.tan((Math.PI * 0.5 + yrad) / 2))];
              return MeshCollision.pointTestQuadMeshInverse(trans, rtree);
            }
            if(type === 0) {
              var p = tps(x, y);
              var latlng = projection.invert(p);
              return projectionMap.getPixelCoords(latlng);
            }
        } else {
            if(type === 1) {
              return [[x, y]];
            }
            if(type === 0) {
              var p = visMap.getPixelCoords([x, y]);
              return p;
            }
        }
    }

    function updatePointers(vnode, index, x, y) {
        var wrappers = vnode.dom.getElementsByClassName('pointer-wrapper');
        var tps = vnode.state.tps;
        var projection = vnode.state.projection;

        var d = Math.floor(pointerWidth / 2);

        var list = projectCanvasCoord(tps, projection, x, y, index, 1, vnode.state.rtree); // transform mouse coord inverse
        var map = projectionMap.getMap();

        for(var i=0; i < 2; i++) {
            var wrapper = wrappers[i];
            if(i === index) {
                wrapper.style.display = 'none';
                wrapper.innerHTML = '';
            } else {
                wrapper.style.display = 'block';
                wrapper.innerHTML = '';
                for(var j = 0; j < list.length; j++) {
                  var iP = list[j];
                  var p = projectCanvasCoord(tps, projection, iP[0], iP[1], i, 0); // transform inverse projected point forward
                  var canvas = createPointer(pointerWidth);
                  canvas.setAttribute("style", `pointer-events:none;position:absolute; left:${Math.round(p[0]) - d}px; top: ${Math.round(p[1]) - d}px`);
                  wrapper.appendChild(canvas);
                }
            }
        }
    }

    return function() {

      function getMercator() {
        var scale = 1;
        var transX = 0;
        var transY = 0;
        var mercRaw = d3.geoMercatorRaw;
        var mercRawInv = d3.geoMercatorRaw.invert;
        var radians = Math.PI / 180;
        var degree = 180 / Math.PI;

        var st = function(p) {
          p[0] = p[0] * scale + transX;
          p[1] = p[1] * scale + transY;
          return p;
        }

        var toDeg = function(p) {
          p[0]*=degree;
          p[1]*=degree;
          return p;
        }

        var projection = function(p) {
           return st(mercRaw(p[0] * radians, -p[1] * radians));
        }

        projection.invert = function(p) {
          return toDeg(mercRawInv((p[0] - transX) / scale, -((p[1] - transY) / scale)));
        }

        projection.scale = function(s) {
          scale = s;
          return projection;
        }
        projection.translate = function (p) {
          transX = p[0];
          transY = p[1];
          return projection;
        }

        return projection;
      }

        function update(vnode) {
          return new Promise((resolve, reject) => {
            if(vnode.state.doImageUpdate) {
              window.requestAnimationFrame(() => (window.requestAnimationFrame(() => {
                var projection = getMercator().scale(1).translate([0,0]);

                var projPoints = utils.projectTargetPoints(vnode.attrs.dataSet.ctrlPoints, projection);
                var filteredPoints = projPoints.filter(p => p.enabled);
                var tps = utils.calcTPS(filteredPoints);
                var mesh = MeshCollision.generateProjectedQuadMesh(tps, 200, vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);

                projectionMap.setTPSPositions(projPoints, mesh, projection);
                stencilProjector.setTPSPositions(mesh, projection);

                stencilProjector.setRenderSize(vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);
                stencilProjector.setTextureSize(vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);
                visProcessor.setSize(vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);

                // generate control points for stencil buffer
                // we need to transform into an image of render size
                var res = utils.findTransform2(mesh, 0, vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);
                var stencilProj = getMercator().scale(1).translate([0,0]);
                stencilProj.scale(res.s);
                stencilProj.translate([res.tx, res.ty]);
                stencilProjector.generateVerts(res.s, res.tx, res.ty);
                stencilProjector.render();
                stencilProjector.renderToCanvas(document.getElementById('canvasDebug'));

                var stencilProjPoints = utils.projectTargetPoints(vnode.attrs.dataSet.ctrlPoints, stencilProj);
                var filteredStencilPoints = stencilProjPoints.filter(p => p.enabled);


                projectionMap.setMeshBounds(stencilProj.invert([0,0]), stencilProj.invert([vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH]));

                visProcessor.setControlPoints(filteredPoints, filteredStencilPoints);

                visProcessor.setStencilMap(stencilProjector.getAlphaMap());


                vnode.state.meanThick = 7 * vnode.attrs.dataSet.renderW / 600;
                vnode.state.zeroThick = 7 * vnode.attrs.dataSet.renderW / 600;
                vnode.state.tps = tps;
                vnode.state.mesh = mesh;
                vnode.state.projection = projection;
                vnode.state.projPoints = projPoints;
                vnode.state.rtree = MeshCollision.quadMeshToRTree(mesh, 200, vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);

                // reset and start first pass
                visProcessor.process(0)
                .then(data => {
                  var project = function(p) {
                    return projection.invert(tps(p[0], p[1]));
                  }

                  if(vnode.attrs.dataSet.features.length === 0) {
                    var features = ContourModule.calcSegmentation2(data, [vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH], project, 0.5);
                    vnode.attrs.dataSet.features = features;
                  }
                  visMap.setFeatures(vnode.attrs.dataSet.features);
                  projectionMap.setFeatures(vnode.attrs.dataSet.features);

                  //visMap.setCanvas(segmentCanvas);
                  return drawAll(vnode)
                  .then(() => {
                    //visMap.setSize(vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);
                    if(vnode.state.fitMeshBounds) {
                      visMap.setSize(vnode.attrs.dataSet.renderW, vnode.attrs.dataSet.renderH);
                      projectionMap.fitMeshBounds();
                    }
                    vnode.state.doImageUpdate = false;
                    m.redraw();
                    resolve();
                  });
                });
              })));
            } else {
              resolve();
            }
          });
        }

        var curVNode = null;

        return {
            onbeforeupdate: (vnode, old) => {
              curVNode = vnode;
              vnode.state.doImageUpdate = (vnode.attrs.dataSet !== old.attrs.dataSet);
              vnode.state.fitMeshBounds = true;
              if(vnode.state.doImageUpdate) {
                vnode.state.selection = { type : null };
              }
              return true;
            },
            onupdate: update,
            oninit: (vnode) => {
                vnode.state.typeProj = 2;
                vnode.state.alphaProj = 0.5;
                vnode.state.alphaVis = 0.2;
                vnode.state.visType = 1;
                vnode.state.bitMask = 15;
                vnode.state.renderCP = true;
                vnode.state.gridProj = false;
                vnode.state.overlap = true;
                vnode.state.meanThick = 7;
                vnode.state.zeroThick = 7;
                vnode.state.rtree = new rbush(9, ['[0]', '[1]', '[2]', '[3]']);
                vnode.state.mapWidth = 600;
                vnode.state.doImageUpdate = true;
                vnode.state.fitMeshBounds = true;
                vnode.state.editorHeight = 200;
                vnode.state.selection = { type : null };
                curVNode = vnode;
            },
            oncreate: (vnode) => {
                var mapsReady = 0;
                var curLatLng = null;

                projectionMap.events.on('mousemove', (e) => {
                  updatePointers(curVNode, 1, e.latlng.lng, e.latlng.lat);
                });

                visMap.events.on('selection', e => {
                  vnode.state.selection = e;
                  projectionMap.setSelection(e);
                  m.redraw();
                });

                visMap.events.on('mousemove', (e) => {
                  curLatLng = e.latlng;
                  // transform fake lat/lng to original pixel coords
                  updatePointers(curVNode, 0, e.latlng.lng, -e.latlng.lat);
                });
                visMap.events.on('keypress', (e) => {
                  if(curLatLng) {
                    var list = projectCanvasCoord(curVNode.state.tps, curVNode.state.projection, curLatLng.lng, -curLatLng.lat, 0, 1, vnode.state.rtree);
                    var p = list[0];

                    var minDist = Infinity;
                    var minP;
                    for(var cP of curVNode.attrs.dataSet.ctrlPoints) {
                      var dist = (cP.x1 - p[0]) * (cP.x1 - p[0]) + (cP.y1 - p[1]) * (cP.y1 - p[1]);
                      if(!minP || dist < minDist) {
                        minP = cP;
                        minDist = dist;
                      }
                    }
                    minP.enabled = !minP.enabled;
                    curVNode.state.doImageUpdate = true;
                    curVNode.state.fitMeshBounds = false;
                    update(curVNode).
                    then(() => {
                      updatePointers(curVNode, 0, curLatLng.lng, -curLatLng.lat);
                    });
                  }
                });

                projectionMap.events.on('mapReady', (e) => {
                  mapsReady++;
                  if(mapsReady === 2) {
                    update(curVNode);
                  }
                });
                visMap.events.on('mapReady', (e) => {
                  mapsReady++;
                  if(mapsReady === 2) {
                    update(curVNode);
                  }
                });

                projectionMap.setCanvas(document.getElementById('canvasVis'));
            },
            view: (vnode) => {
              return m('.flex-col', [
                m('.flex-header', [
                  m('.optionsbackground.rounded', [
                    m('p.optionsheader','Options'),
                    m('.spacer'),
                    m(options, {onChange: (state) => {
                      vnode.state.renderCP = Boolean(state.renderCP);
                      vnode.state.visType = Number(state.visType);
                      vnode.state.overlap = Boolean(state.overlap);
                      vnode.state.bitMask = Number(state.shrink) + (Number(state.mag) << 1) + (Number(state.fold) << 2) + (Number(state.unfold) << 3);
                      drawAll(vnode);
                    }}),
                  ]),
                ]),
                m('.flex-col.rounded', {style: {width:'1247px'}}, [
                  m('.flex-row', [
                    m(imageContainerSelect, {
                        pointerWidth,
                        type: 'vis',
                        title: 'Historic Map',
                        width: vnode.state.mapWidth,
                        height: vnode.state.mapWidth,
                        showLoader: vnode.state.doImageUpdate,
                        content: [
                          m('div', {
                            style: {
                              width:vnode.state.mapWidth + "px",
                              height:vnode.state.mapWidth + "px",
                              background:'#fff',
                              display: 'flex',
                              'flex-direction': 'column'
                            }
                          }, [
                            m('div', {
                              style: {
                                width: '100%',
                                height: '100%',
                                'flex-grow': 0,
                                overflow: 'hidden',
                              }
                            },
                            m(visMap, {
                              class: 'projectionMap',
                              width: vnode.attrs.dataSet.renderW,
                              height: vnode.attrs.dataSet.renderW,
                            })),
                            m('div', {
                              class: 'resize-div',
                              style: {
                                display: vnode.state.selection.type === null ? 'none' : 'block',
                              },
                              onmousedown: function(e) {
                                var firstY = null;
                                var firstHeight = vnode.state.editorHeight;
                                var mouseUp = function(e) {
                                  document.body.removeEventListener('mouseup', mouseUp, true);
                                  document.body.removeEventListener('mousemove', mouseMove, true);
                                }
                                var mouseMove = function(e) {
                                  if(firstY === null) {
                                    firstY = e.clientY;
                                  } else {
                                    vnode.state.editorHeight = firstHeight - (e.clientY - firstY);
                                    m.redraw();
                                  }
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                                document.body.addEventListener('mouseup', mouseUp, true);
                                document.body.addEventListener('mousemove', mouseMove, true);
                                e.preventDefault();
                              },
                            }),
                            m(AnnotationEditor, {
                              features: vnode.attrs.dataSet.features,
                              ctrlPoints: vnode.attrs.dataSet.ctrlPoints,
                              selection: vnode.state.selection,
                              style: {
                                'height': vnode.state.editorHeight + 'px',
                              },
                              class: 'annotation-wrapper'
                            }),
                          ]),
                          m('canvas', {
                            style: { display: 'none'},
                            id: 'canvasVis',
                            width: vnode.attrs.dataSet.renderW,
                            height:vnode.attrs.dataSet.renderH
                          }),
                          m('.content-wrapper', {
                              style: { display: 'none'},
                          },[
                              m('canvas', {
                                style: { display: 'none'},
                                id: 'canvasDebug',
                                width: vnode.attrs.dataSet.renderW * 2,
                                height:vnode.attrs.dataSet.renderH * 2
                              }),
                              m('div', {id: 'debugWrapper'})
                          ])
                        ]
                    }),
                    m(imageContainerSelect, {
                        pointerWidth,
                        alpha: vnode.state.alphaProj,
                        title: 'Reference Map',
                        type: 'projected',
                        onChange: (state) => {
                          vnode.state.alphaProj = Number(state.alpha);
                          updateProjectedImage(vnode);
                        },
                        width: vnode.state.mapWidth,
                        height: vnode.state.mapWidth,
                        showLoader: vnode.state.doImageUpdate,
                        content: [
                          m('div', {
                            style: {
                              width:vnode.state.mapWidth + "px",
                              height:vnode.state.mapWidth + "px",
                              background:'#fff'
                            }
                          }, m(projectionMap, { class: 'projectionMap'}))
                        ]
                    }),
                  ]),
                  m('div.legendwrapper', [
                    m('table', { width: '100%' }, [
                        m('tr', [
                           m('td', {colspan: 2, width: '33%'}),
                           m('td.info-heading', {colspan: 2, width: '33%'}, 'Non Folded Regions'),
                           m('td.info-heading', {colspan: 2, width: '33%'}, 'Folded Regions'),
                        ]),
                        m('tr', [
                            m('td.legendcolor.black', 'Black'),
                            m('td.legendtext', 'Line separating magnified and shrunk regions'),
                            m('td.legendcolor.red', 'Red'),
                            m('td.legendtext', 'Magnification, or scale value larger than the mean.'),
                            m('td.legendcolor.orange', 'Orange'),
                            m('td.legendtext', 'Magnification, or scale value larger than the mean.'),
                        ]),
                        m('tr', [
                            m('td.legendcolor.white', 'White'),
                            m('td.legendtext', 'Line separating folded and non folded regions.'),
                            m('td.legendcolor.blue', 'Blue'),
                            m('td.legendtext', 'Shrinkage, or scale value smaller than the mean.'),
                            m('td.legendcolor.magenta', 'Teal'),
                            m('td.legendtext', 'Shrinkage, or scale value smaller than the mean.'),
                        ]),
                    ]),
                  ])
                ]),
              ]);
            }
        };

    }

});
