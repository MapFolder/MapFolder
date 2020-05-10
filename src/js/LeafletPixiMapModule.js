define([
    './LeafletFeatureModule',
    './LeafletCtrlPointModule',
    'libs/EventEmitter.min.js',
    'js/pixi-mesh/ProjectPlane',
    'd3'
], function(LeafletFeatureModule, LeafletCtrlPointModule, EventEmitter, ProjectPlane, d3) {

    function LeafletPIXIMapModule(numSteps) {
        var events = new EventEmitter();
        var map;
        var leafletContainer = new PIXI.Container();
        var projectPlane = new ProjectPlane(numSteps, numSteps);
        var ctrlPointModule = new LeafletCtrlPointModule();
        var featureModule = new LeafletFeatureModule();

        var pixiOverlay = null;

        function getMap() {
            return map;
        }

        function setCanvas(canvas) {
          projectPlane.setTexture(PIXI.Texture.from(canvas));
        }

        var projPoints;
        var drawPoints;
        var souceProj;
        var meshBounds;

        function setTPSPositions(pPoints, tpsPositions, sProj) {
          projectPlane.setTPSPositions(tpsPositions, sProj);

          ctrlPointModule.setCtrlPoints(pPoints);

          projPoints = pPoints;
          sourceProj = sProj;

          if(pixiOverlay) {
            projectPlane.generateProjectedVerts(pixiOverlay.utils.latLngToLayerPoint);
          }
        }

        function setMeshBounds(topLeft, bottomRight) {
          meshBounds = L.latLngBounds(L.latLng(topLeft[1], topLeft[0]), L.latLng(bottomRight[1], bottomRight[0]));
        }

        function setRenderCP(renderCP) {
          drawPoints = renderCP;
        }

        function setAlpha(alpha) {
          projectPlane.alpha = alpha;
        }

        function setSelection({type, id}) {
          if(type === 'feature') {
            featureModule.setCurFeature(id);
            ctrlPointModule.setCurCtrlPoint(-1);
          } else if (type === 'ctrlPoint') {
            featureModule.setCurFeature(-1);
            ctrlPointModule.setCurCtrlPoint(id);
          } else {
            featureModule.setCurFeature(-1);
            ctrlPointModule.setCurCtrlPoint(-1);
          }
          pixiOverlay.redraw();
        }

        function setFeatures(features) {
          featureModule.setFeatures(features, 'projPolygon', false);
        }

        function updateMap() {
            projectPlane.texture.update();
            pixiOverlay.redraw();
        }

        function fitMeshBounds() {
            if(meshBounds) {
              map.fitBounds(meshBounds, {animate: false, paddingTopLeft: [ 5, 5], paddingBottomRight: [5, 5]});
            }
        }

        function getLatLng(x, y) {
          if(map) {
            var latlng = map.layerPointToLatLng(L.point(x, y));
            return [latlng.lng, latlng.lat];
          } else {
            return [0,0];
          }
        }

        function getPixelCoords(latlng) {
          if(map) {
            var bounds = map.getPixelBounds();
            var proj = map.project(L.latLng(latlng[1], latlng[0]));
            var pixel = proj.subtract(bounds.min);
            // these offsets are manually determined using chromium browser
            // TODO: find a correct way to trandsform lat/lng to pixel coords
            return [pixel.x - 2.5, pixel.y - 1.89];
          } else {
            return [0,0];
          }
        }


        function createMap(element) {

            var firstDraw = true;

            map = new L.Map(element, {
              center: [47, 1],
              zoom: 4,
              zoomSnap: 0.01,
              zoomDelta: 0.5,
              wheelPxPerZoomLevel: 120,
              inertia: false,
              zoomControl:false,
              attributionControl: false
            })
            //.addLayer(new L.TileLayer("http://tile.stamen.com/watercolor/{z}/{x}/{y}.jpg"));
            //.addLayer(new L.TileLayer.Grayscale("http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"));
            .addLayer(new L.TileLayer("http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"));
            //.addLayer(new L.TileLayer("https://api.mapbox.com/styles/v1/kjghoinhbf/cjl449me22j1x2sqnyzx6k9id/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoia2pnaG9pbmhiZiIsImEiOiJjamt5MzloOHkwMDVhM3BvNGRna20xMHhmIn0.ikpPWLOOYyNL5GKqJzztxQ"));

            leafletContainer.addChild(projectPlane);
            leafletContainer.addChild(featureModule.mesh);
            leafletContainer.addChild(ctrlPointModule.graphics);

            pixiOverlay = L.pixiOverlay(function(utils) {
                var zoom = utils.getMap().getZoom();
                var container = utils.getContainer();
                var renderer = utils.getRenderer();
                var bounds = map.getBounds();
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var p1 = pixiOverlay.utils.latLngToLayerPoint([ne.lat,ne.lng]);
                var p2 = pixiOverlay.utils.latLngToLayerPoint([sw.lat,sw.lng]);
                var dx = p1.x - p2.x;
                //var dy = p2.y - p1.y;
                var radius = dx / 100;

                var projectPoint = function(p) {
                  var latlng = sourceProj.invert([p.x2, p.y2]);
                  return utils.latLngToLayerPoint([latlng[1],latlng[0]]);
                }

                var projectFeature = function(p) {
                  return utils.latLngToLayerPoint([p.y1, p.x1]);
                }

                ctrlPointModule.render(projectPoint, radius, Math.abs(ne.lat - sw.lat) / 100, drawPoints);
                featureModule.render(projectFeature, radius);

                //prevZoom = zoom;
                renderer.render(container);
                //console.log('rerender pixi');
            }, leafletContainer);

            pixiOverlay.addTo(map);
            var curLatLng = null;
            map.on('mousemove', (e) => {
              curLatLng = e.latlng;
              events.emit('mousemove', e);
            });
            map.on('zoom', (e) => {
                if(curLatLng) {
                    e.latlng = curLatLng;
                    events.emit('mousemove', e);
                }
            });

            events.emit('mapReady');
        }


        return {
            oncreate: function(vnode) {
                createMap(vnode.dom);
            },
            view: (vnode) => {
                return m('div', vnode.attrs)
            },
            events,
            setCanvas,
            setTPSPositions,
            setMeshBounds,
            setAlpha,
            setRenderCP,
            setSelection,
            setFeatures,
            getLatLng,
            getPixelCoords,
            getMap,
            updateMap,
            fitMeshBounds
        }
    }

    return LeafletPIXIMapModule;
});
