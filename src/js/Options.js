define([], function() {

    return function() {

        return {
            oninit: (vnode) => {
                vnode.state.shrink = true;
                vnode.state.mag = true;
                vnode.state.fold = true;
                vnode.state.unfold = true;
                vnode.state.overlap = true;
                vnode.state.visType = 1;
                vnode.state.renderCP = 1;
            },
            view: (vnode) => {
              var updBool = function(prop) {
                return (e) => {
                    e.redraw = false;
                    vnode.state[prop] = e.currentTarget.checked;
                    if(vnode.attrs.onChange) {
                        vnode.attrs.onChange(vnode.state);
                    }
                }
              }

              var updRadio = function(prop) {
                return (e) => {
                  //e.redraw = false;
                  vnode.state[prop] = Number(e.target.value);
                  if(vnode.attrs.onChange) {
                      vnode.attrs.onChange(vnode.state);
                  }
                }
              }

              return m('div', [
                m('table', [
                  m('tr.optionrow', [
                      m('td', m('label.optiontype','Visualization Type')),
                      m('td.optioncell', [
                        m('label', [ 'Original Image', m('input', { type: 'radio', name:'visType', value: '0', checked: (vnode.state.visType === 0) , onchange: updRadio('visType')})]),
                        m('label', [ 'Contours', m('input', { type: 'radio', name:'visType', value: '1', checked: (vnode.state.visType === 1), onchange: updRadio('visType')})]),
                        m('label', [ 'Mix', m('input', { type: 'radio', name:'visType', value: '2', checked: (vnode.state.visType === 2), onchange: updRadio('visType')})]),
                        m('label', [ 'Regions', m('input', { type: 'radio', name:'visType', value: '3', checked: (vnode.state.visType === 3), onchange: updRadio('visType')})]),
                      ])
                  ]),
                  m('tr.optionrow', [
                      m('td', m('label.optiontype','Regions')),
                      m('td.optioncell', [
                        m('label', [ 'Shrunk:', m('input', { type: 'checkbox', checked: vnode.state.shrink, onchange: updBool('shrink')})]),
                        m('label', [ 'Magnified:', m('input', { type: 'checkbox', checked: vnode.state.mag, onchange: updBool('mag')})]),
                        m('label', [ 'Non Folded:', m('input', { type: 'checkbox', checked: vnode.state.unfold, onchange: updBool('unfold')})]),
                        m('label', [ 'Folded:', m('input', { type: 'checkbox', checked: vnode.state.fold, onchange: updBool('fold')})]),
                        m('label', [ 'Overlap:', m('input', { type: 'checkbox', checked: vnode.state.overlap, onchange: updBool('overlap')})]),
                      ])
                  ]),
                  m('tr.optionrow', [
                      m('td', m('label.optiontype','Control Points')),
                      m('td.optioncell', [
                        m('label', [ 'Off', m('input', { type: 'radio', name:'cp', value: '0', checked: (vnode.state.renderCP === 0) , onchange: updRadio('renderCP')})]),
                        m('label', [ 'On', m('input', { type: 'radio', name:'cp', value: '1', checked: (vnode.state.renderCP === 1), onchange: updRadio('renderCP')})]),
                      ])
                  ]),
                ])
              ]);
            }
        };

    }

});
