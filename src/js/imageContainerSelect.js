define([], function() {

    return function() {

        function hidePointers() {
            var pointers = document.getElementsByClassName('pointer');
            for(var i=0; i < pointers.length; i++) {
                pointers[i].style.display = 'none';
            }
        }

        return {
            oninit: (vnode) => {
                vnode.state.alpha = vnode.attrs.alpha;
            },
            oncreate: (vnode) => {
              /*
                var half = Math.floor(vnode.attrs.pointerWidth / 2);
                var pointer = vnode.dom.getElementsByClassName('pointer')[0];
                pointer.style.display = 'none';
                var ctx = pointer.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, half - 2, vnode.attrs.pointerWidth, 5);
                ctx.fillRect(half - 2, 0, 5, vnode.attrs.pointerWidth);
                ctx.fillStyle = '#000';
                ctx.fillRect(1, half - 1, vnode.attrs.pointerWidth - 2, 3);
                ctx.fillRect(half - 1, 1, 3, vnode.attrs.pointerWidth - 2);
                */
            },
            view: (vnode) => {
                var headerChilds = [ vnode.attrs.title ];

                if(vnode.attrs.type === 'projected') {

                    headerChilds.push(
                        m('label.alphalabel', [
                          'Opacity:',
                          m('input', {
                              //class:'dataset-select-select',
                              onchange: (e) => {
                                  e.redraw = false;
                                  vnode.state.alpha = e.currentTarget.value;
                                  if(vnode.attrs.onChange) {
                                      vnode.attrs.onChange(vnode.state);
                                  }
                              },
                              type: 'range',
                              min: '0',
                              max: '1',
                              step: '0.1',
                              style: 'width: 50px',
                              value: vnode.state.alpha
                          })
                      ])
                    );
                  }

                headerChild = m('div', headerChilds);
                return m('.image-container', {class:vnode.attrs.class}, [
                    m('.header', {}, headerChild),
                    m('.content-wrapper', {
                        //onmouseout: (e) => {e.redraw = false; hidePointers(); }
                    },[
                        m('.loader', {
                          style: {
                            width: vnode.attrs.width + 'px',
                            height: vnode.attrs.height + 'px',
                            'line-height': vnode.attrs.height + 'px',
                            display: vnode.attrs.showLoader ? 'block' : 'none',
                          },
                        },
                        [
                          'loading...'
                        ]),
                        m('.content', vnode.attrs.content),
                        m('.pointer-wrapper')
                        //m('canvas', {class:'pointer', width: vnode.attrs.pointerWidth, height: vnode.attrs.pointerWidth})
                    ])
                ]);
            }
        };

    }

});
