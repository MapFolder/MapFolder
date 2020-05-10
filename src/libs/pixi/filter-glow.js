/*!
 * @pixi/filter-glow - v3.1.1
 * Compiled Wed, 22 Apr 2020 17:47:31 UTC
 *
 * @pixi/filter-glow is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
var __filters=function(n,o,t){"use strict";var r="attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}",e="varying vec2 vTextureCoord;\nvarying vec4 vColor;\n\nuniform sampler2D uSampler;\n\nuniform float outerStrength;\nuniform float innerStrength;\n\nuniform vec4 glowColor;\n\nuniform vec4 filterArea;\nuniform vec4 filterClamp;\nuniform bool knockout;\n\nconst float PI = 3.14159265358979323846264;\n\nconst float DIST = __DIST__;\nconst float ANGLE_STEP_SIZE = min(__ANGLE_STEP_SIZE__, PI * 2.0);\nconst float ANGLE_STEP_NUM = ceil(PI * 2.0 / ANGLE_STEP_SIZE);\n\nconst float MAX_TOTAL_ALPHA = ANGLE_STEP_NUM * DIST * (DIST + 1.0) / 2.0;\n\nvoid main(void) {\n    vec2 px = vec2(1.0 / filterArea.x, 1.0 / filterArea.y);\n\n    float totalAlpha = 0.0;\n\n    vec2 direction;\n    vec2 displaced;\n    vec4 curColor;\n\n    for (float angle = 0.0; angle < PI * 2.0; angle += ANGLE_STEP_SIZE) {\n       direction = vec2(cos(angle), sin(angle)) * px;\n\n       for (float curDistance = 0.0; curDistance < DIST; curDistance++) {\n           displaced = clamp(vTextureCoord + direction * \n                   (curDistance + 1.0), filterClamp.xy, filterClamp.zw);\n\n           curColor = texture2D(uSampler, displaced);\n\n           totalAlpha += (DIST - curDistance) * curColor.a;\n       }\n    }\n    \n    curColor = texture2D(uSampler, vTextureCoord);\n\n    float alphaRatio = (totalAlpha / MAX_TOTAL_ALPHA);\n\n    float innerGlowAlpha = (1.0 - alphaRatio) * innerStrength * curColor.a;\n    float innerGlowStrength = min(1.0, innerGlowAlpha);\n    \n    vec4 innerColor = mix(curColor, glowColor, innerGlowStrength);\n\n    float outerGlowAlpha = alphaRatio * outerStrength * (1. - curColor.a);\n    float outerGlowStrength = min(1.0 - innerColor.a, outerGlowAlpha);\n\n    vec4 outerGlowColor = outerGlowStrength * glowColor.rgba;\n    \n    if (knockout) {\n      float resultAlpha = outerGlowAlpha + innerGlowAlpha;\n      gl_FragColor = vec4(glowColor.rgb * resultAlpha, resultAlpha);\n    }\n    else {\n      gl_FragColor = innerColor + outerGlowColor;\n    }\n}\n",i=function(n){function o(t){var i=Object.assign({},o.defaults,t),l=i.distance,a=i.outerStrength,u=i.innerStrength,c=i.color,s=i.knockout,f=i.quality;l=Math.round(l),n.call(this,r,e.replace(/__ANGLE_STEP_SIZE__/gi,""+(1/f/l).toFixed(7)).replace(/__DIST__/gi,l.toFixed(0)+".0")),this.uniforms.glowColor=new Float32Array([0,0,0,1]),Object.assign(this,{color:c,outerStrength:a,innerStrength:u,padding:l,knockout:s})}n&&(o.__proto__=n),o.prototype=Object.create(n&&n.prototype),o.prototype.constructor=o;var i={color:{configurable:!0},outerStrength:{configurable:!0},innerStrength:{configurable:!0},knockout:{configurable:!0}};return i.color.get=function(){return t.rgb2hex(this.uniforms.glowColor)},i.color.set=function(n){t.hex2rgb(n,this.uniforms.glowColor)},i.outerStrength.get=function(){return this.uniforms.outerStrength},i.outerStrength.set=function(n){this.uniforms.outerStrength=n},i.innerStrength.get=function(){return this.uniforms.innerStrength},i.innerStrength.set=function(n){this.uniforms.innerStrength=n},i.knockout.get=function(){return this.uniforms.knockout},i.knockout.set=function(n){this.uniforms.knockout=n},Object.defineProperties(o.prototype,i),o}(o.Filter);return i.defaults={distance:10,outerStrength:4,innerStrength:0,color:16777215,quality:.1,knockout:!1},n.GlowFilter=i,n}({},PIXI,PIXI.utils);Object.assign(PIXI.filters,__filters);
//# sourceMappingURL=filter-glow.js.map
