define([], function() {

    var typeMapping = {
      'mag' : 'magnified',
      'shrink': 'shrunk',
      'negShrink': 'shrunk flipped',
      'negMag': 'magnified flipped',
    };

    function getAnnotations(selection, ctrlPoints, features) {
      switch(selection.type) {
        case 'ctrlPoint':
          return ctrlPoints[selection.id].annotations;
        case 'feature':
          return features[selection.id].annotations;
      }
      return null;
    }

    function getHeader(selection, ctrlPoints, features) {
      switch(selection.type) {
        case 'ctrlPoint':
          return `Annotation for control point ${selection.id} / ${ctrlPoints.length}`;
        case 'feature':
          var rType = features[selection.id].type;
          var sumTypes = 0;
          var typeIdx = 0;
          for(var feature of features) {
            if(feature.type === rType) {
              sumTypes++;
            }
            if(feature === features[selection.id]) {
              typeIdx = sumTypes;
            }
          }
          return `Annotation for ${typeMapping[rType]} region ${typeIdx} / ${sumTypes}`;
      }
      return '';
    }

    function setAnnotation(annotations, id, content) {
      var idx = Math.floor(id / 2);
      var prop = id % 2 ? 'value' : 'key';
      annotations[idx][prop] = content;
    }

    function getEditorTable(vnode, annotations) {
      var table = [];

      var oncreate = ({dom}) => {
        dom.focus();
      };
      var onblur = e => {
        if(!e.relatedTarget || e.relatedTarget.className !== 'editorcontrol ') {
          vnode.state.selectedId = -1;
        }
      };
      var onfocus = e => {
        var id = Number(e.currentTarget.parentElement.getAttribute('data-id'));
        vnode.state.selectedId = Math.floor( id / 2 ) * 2;
      }

      var onclick = e =>  {
        var id = Number(e.currentTarget.getAttribute('data-id'));
        vnode.state.selectedId = id;
      }

      var oninput = e => {
        setAnnotation(annotations, Number(e.currentTarget.parentElement.getAttribute('data-id')), e.currentTarget.innerHTML);
      };


      table.push(m('tr.editor-table-header-row', [
        m('th.editor-table-header-cell', 'Name'),
        m('th.editor-table-header-cell', 'Value'),
      ]));


      for(var i = 0; i < annotations.length; i++) {
        var id = i * 2;
        var item = annotations[i];
        table.push(
          m(vnode.state.selectedId === id ? 'tr.editorrowselected' : 'tr', { onclick, 'data-id': id }, [
            m('td.editorcell.nostretch', { tabindex: -1, 'data-id': id },
              m('p', { class: 'editor-item-display', contenteditable: true, oninput, onblur, onfocus }, m.trust(item.key))
            ),
            m('td.editorcell.truncate', { tabindex: -1, 'data-id': id + 1},
              m('p', { class: 'editor-item-display', contenteditable: true, oninput, onblur, onfocus }, m.trust(item.value))
            ),
          ])
        );
      }
      return table;
    }

    return function() {
        return {
            oninit: (vnode) => {
              vnode.state.editId = -1;
              vnode.state.selectedId = -1;
            },
            onbeforeupdate: (vnode, old) => {
              if(vnode.attrs.selection.type !== old.attrs.selection.type || vnode.attrs.selection.id !== old.attrs.selection.id) {
                vnode.state.editId = -1;
                vnode.state.selectedId = -1;
              }
              return true;
            },
            view: (vnode) => {
              if(vnode.attrs.selection.type) {

                var header = getHeader(vnode.attrs.selection, vnode.attrs.ctrlPoints, vnode.attrs.features);
                var annotations = vnode.state.annotations = getAnnotations(vnode.attrs.selection, vnode.attrs.ctrlPoints, vnode.attrs.features);
                var table = getEditorTable(vnode, annotations);

                return m('div', {
                  style: vnode.attrs.style,
                  class: vnode.attrs.class,
                },[
                  m('div.editorheader', [
                    m('p.header.grow', header),
                    m('p.editorcontrol', { title: 'Add Annotation', style: { 'padding-top': '1px' }, onclick: e => {
                      annotations.push({key:'', value: ''});
                    }}, '+'),
                    m('p.editorcontrol', { tabindex: 1, class: vnode.state.selectedId !== -1 ? '' : 'disabled', title: 'Remove Selected Annotation',
                      onclick: e => {
                        console.log('onclick');
                        vnode.state.annotations.splice(vnode.state.selectedId / 2, 1);
                        vnode.state.selectedId = -1;
                      }
                    }, '-')
                  ]),
                  m('table.editor-table', table),
                ]);
              } else {
                return m('div');
              }
            }
        };

    }

});
