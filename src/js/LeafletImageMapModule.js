define([
    './LeafletFeatureModule',
    './LeafletCtrlPointModule',
    'libs/EventEmitter.min.js',
    'd3'
], function(LeafletFeatureModule, LeafletCtrlPointModule, EventEmitter, d3) {

    function LeafletImageMapModule() {
        var events = new EventEmitter();
        var map;
        var leafletContainer = new PIXI.Container();
        var featureModule = new LeafletFeatureModule();
        var ctrlPointModule = new LeafletCtrlPointModule();

        var pixiOverlay = null;
        var imgUrl = null;
        var drawPoints = false;
        var imgOverlay = null;

        function getMap() {
            return map;
        }

        function setCanvas(canvas) {
            imgOverlay.canvas.width = canvas.width;
            imgOverlay.canvas.height = canvas.height;
            var ctx = imgOverlay.canvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0);
        }

        function setSize(w, h) {
          if(map) {
            // calculate the edges of the image, in coordinate space
            var southWest = map.unproject([0, h], 0);
            var northEast = map.unproject([w, 0], 0);
            var bounds = new L.LatLngBounds(southWest, northEast);
            imgOverlay.setBounds(bounds);
            var zoom = Math.log2(600/w);
            map.setMinZoom(zoom - 4);
            map.setMaxZoom(zoom + 10);
            map.fitBounds(bounds, {animate: false, paddingTopLeft: [ 5, 5], paddingBottomRight: [5, 5]});
          }
        }

        function setCtrlPoints(points) {
          ctrlPointModule.setCtrlPoints(points);
        }

        function setFeatures(features) {
          featureModule.setFeatures(features, 'polygon', false);
        }

        function setRenderCP(renderCP) {
          drawPoints = renderCP;
        }

        function updateMap() {
          pixiOverlay.redraw();
        }

        function getLatLng(x, y) {
          if(map) {
            var latlng = map.layerPointToLatLng(L.point(x, y));
            return [latlng.lng, latlng.lat];
          } else {
            return [0,0];
          }
        }

        function getPixelCoords(imgPixel) {
          if(map) {
            var bounds = map.getPixelBounds();
            var proj = map.project(L.latLng(-imgPixel[1], imgPixel[0]));
            var pixel = proj.subtract(bounds.min);
            //console.log(pixel);
            return [pixel.x - 2.5, pixel.y - 1.89];
          } else {
            return [0,0];
          }
        }

        function createMap(element, w, h) {
          // create the slippy map
             map = L.map(element, {
              minZoom: -3,
              maxZoom: 12,
              zoomSnap: 0.0001,
              //wheelPxPerZoomLevel: 120,
              center: [-h/2, w/2],
              zoom: Math.log2(600/w * 2),
              inertia: false,
              zoomControl:false,
              attributionControl: false,
              crs: L.CRS.Simple
            });

            // calculate the edges of the image, in coordinate space
            var southWest = map.unproject([0, h], 2);
            var northEast = map.unproject([w, 0], 2);
            var bounds = new L.LatLngBounds(southWest, northEast);

            // add the image overlay,
            // so that it covers the entire map
            // first create a dummy image
            imgOverlay = L.imageOverlay.canvas(bounds, {zIndex: 1});
            imgOverlay.addTo(map);

            leafletContainer.addChild(featureModule.mesh);
            leafletContainer.addChild(ctrlPointModule.graphics);
            var renderer = null;

            pixiOverlay = L.pixiOverlay(function(utils) {
                var zoom = utils.getMap().getZoom();
                var container = utils.getContainer();
                renderer = utils.getRenderer();

                var project = function(p) {
                  return utils.latLngToLayerPoint([-p.y1, p.x1]);
                }

                var bounds = map.getBounds();
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var p1 = pixiOverlay.utils.latLngToLayerPoint([ne.lat,ne.lng]);
                var p2 = pixiOverlay.utils.latLngToLayerPoint([sw.lat,sw.lng]);
                var dx = p1.x - p2.x;
                //var dy = p2.y - p1.y;
                var radius = dx / 100;

                ctrlPointModule.render(project, radius, Math.abs(ne.lat - sw.lat) / 100, drawPoints);
                featureModule.render(project, radius);
                renderer.render(container);
            }, leafletContainer);

            pixiOverlay.addTo(map);

            map.on('click', e => {
              var x = e.latlng.lng;
              var y = -e.latlng.lat;
              var type = null;
              var id = -1;
              var ctrlPoint = ctrlPointModule.hitTest(x, y);
              ctrlPointModule.setCurCtrlPoint(ctrlPoint);
              var feature = featureModule.hitTest(x, y);
              var type = (ctrlPoint > -1) ? 'ctrlPoint' : ((feature > -1) ? 'feature' : null);
              var id = (ctrlPoint > -1) ? ctrlPoint : feature;
              ctrlPointModule.setCurCtrlPoint(ctrlPoint);
              if(type === 'feature') {
                featureModule.setCurFeature(feature);
              } else {
                featureModule.setCurFeature(-1);
              }
              events.emit('selection', { type, id });
              updateMap();
            });

            map.on('mousemove', (e) => {
              events.emit('mousemove', e);
            });
            map.on('keypress', (e) => {
              events.emit('keypress', e);
            })

            events.emit('mapReady');
        }


        return {
            oncreate: function(vnode) {
                createMap(vnode.dom, vnode.attrs.width, vnode.attrs.height);
            },
            view: (vnode) => {
                return m('div', vnode.attrs)
            },
            events,
            setCanvas,
            setFeatures,
            setSize,
            setCtrlPoints,
            setRenderCP,
            getLatLng,
            getPixelCoords,
            getMap,
            updateMap
        }
    }

    return LeafletImageMapModule;
});
