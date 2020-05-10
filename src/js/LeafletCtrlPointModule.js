define(['./constants'], function(constants) {

    class LeafLetCtrlPointModule {

      constructor() {
        this.graphics = new PIXI.Graphics();
        this.ctrlPoints = null;
        this.curCtrlPoint = -1;
        this.radius = 1;
      }

      hitTest(x, y) {
        for(var i = 0; i < this.ctrlPoints.length; i++) {
          var p = this.ctrlPoints[i];
          var dx = x - p.x1;
          var dy = y - p.y1;
          var d = Math.sqrt(dx * dx + dy * dy);
          if(d < this.radius) {
            return i;
          }
        }
        return -1;
      }

      setCurCtrlPoint(id) {
        this.curCtrlPoint = id;
      }

      setCtrlPoints(points) {
        this.ctrlPoints = points;
      }

      render(project, drawRadius, hitRadius, drawPoints) {
        this.radius = hitRadius;
        var selectedRadius = drawRadius * 1.2;
        if(this.ctrlPoints && drawPoints) {
          this.graphics.clear();
          for(var i = 0; i < this.ctrlPoints.length; i++) {
            var p = this.ctrlPoints[i];
            var pixel = project(p);
            var radius = i === this.curCtrlPoint ? selectedRadius : drawRadius;
            var alpha = i === this.curCtrlPoint ? 1 : 0.9;
            this.graphics.beginFill(i === this.curCtrlPoint ? constants.selectedColor : p.enabled ? constants.pointColor : constants.disabledColor, alpha);
            this.graphics.lineStyle(Math.round(radius / 3), 0, alpha);
            this.graphics.drawCircle(pixel.x, pixel.y, radius);
            this.graphics.endFill();
            this.graphics.closePath();
          }

        } else {
          this.graphics.clear();
        }
      }
    }

    return LeafLetCtrlPointModule;
});
