//import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
//import { ISettingRegistry } from "@jupyterlab/coreutils";
(function(){
var core = require('@jupyterlab/coreutils');
var mime = require('@jupyterlab/rendermime');
var widgets = require('@phosphor/widgets');
 
class OutputWidget extends widgets.Widget {
  /**
   * Construct a new output widget.
   */
  constructor(options, shared_state) {
    super();
    this._options = options;
    this._state = shared_state;
    this._mimeType = options.mimeType;
    // this.addClass(CLASS_NAME);
  }

  /**
   * Render CLJ into this widget's node.
   */
  renderModel(model) {
    this.node.innerHTML = "<div class=iclj>" + model.data["text/iclojure-html"] + "</div>";
    pushTrails(this.node.firstElementChild.firstElementChild);
    this.node.onclick = click_handler(this._state);
    return Promise.resolve(undefined);
  }
}

function ensure_comm(state) {
  if (state.comm) return state.comm;
  const comm = state.comm = state.context.session.kernel.connectToComm("expansion");
  comm.onMsg = function(msg) {
    const expr = msg.content.data["elision-id"];
    const html = msg.content.data.expansion;
    const elt = state.pending[expr];
    const pelt = elt.parentNode;
    const div = document.createElement('div');
    div.innerHTML = html;
    console.log('html', html);
    let nnode;
    let pnode = div.firstElementChild.firstElementChild.firstElementChild;
    if (elt.previousElementSibling && elt.previousElementSibling.classList.contains('browser')
        && pnode.firstElementChild && pnode.firstElementChild.classList.contains('seq'))
      pnode = pnode.firstElementChild.firstElementChild;
    for(let node = pnode.firstChild;
        node && node.classList && !node.classList.contains('trail');
        node = nnode) {
      nnode = node.nextSibling;
      pelt.insertBefore(node, elt);
    }
    pelt.removeChild(elt);
    pushTrails(elt.closest('.iclj'));
  };
  comm.open();
  return comm;
}

const click_handler = (state) => function(e) {
  e.stopPropagation();
  let elt = e.target;
  if (elt.tagName !== "LI") return;
  if (elt.classList.contains("browser")) {
    elt.classList.toggle("expanded");
    elt = elt.nextElementSibling;
    if (elt.classList.contains("elision")) {
      let expr =  elt.dataset.expr;
      state.pending[expr]=elt;
      ensure_comm(state).send({"elision-id": expr});
    }
    return;
  }
  if (elt.classList.contains("elision")) {
    let expr =  elt.dataset.expr;
    state.pending[expr]=elt;
    ensure_comm(state).send({"elision-id": expr});
    return;
  }
  if (elt.parentElement.parentElement.classList.contains('collapsed'))
    elt = elt.parentElement.parentElement;

  if (!elt.firstElementChild) return;
  while(elt.tagName !== "LI" || !elt.firstElementChild) elt = elt.parentElement;
  if (!elt) return;
  if (elt.classList.contains("expanded")) {
    elt.classList.remove("expanded");
    elt.classList.add("collapsed");
    while(true) {
      let n = 0;
      for(let sib = elt.parentElement.firstElementChild; sib; sib = sib.nextElementSibling) {
        if (sib.classList.contains("contains-expanded") || sib.classList.contains("expanded")) n++; 
      }
      if (n > 0) break;
      let anc = elt.parentElement.parentElement;
      if (anc.tagName !== "LI") break;
      anc.classList.remove("contains-expanded");
      elt = anc;
    }
  } else if (elt.classList.contains("collapsed")) {
    elt.classList.remove("collapsed");
  } else {
    elt.classList.add("expanded");
    for(let anc = elt.parentElement.parentElement; anc !== this.firstElementChild; anc = anc.parentElement.parentElement) {
      anc.classList.add("contains-expanded");
    }
  }
}


function div(s) {
  let div = document.createElement('div');
  div.innerHTML = s;
  return div;
}

function pushTrails(root_ul) {
  let ul = root_ul;
  while(ul) {
    let li = ul.lastElementChild;
    for(; li && li.classList.contains('trail'); li = li.previousElementSibling);
    let new_ul = li && li.firstElementChild;
    for(li = li && li.previousElementSibling; li; li = li.previousElementSibling)
      li.firstElementChild && pushTrails(li.firstElementChild);
    if (!new_ul) break;
    ul = new_ul;
  }
  const target = ul;
  if (target === root_ul) return;
  for(;ul !== root_ul; ul = ul.parentElement.parentElement)
    for(let li = ul.parentElement.nextElementSibling; li; li = li.nextElementSibling)
      target.appendChild(li);
}

const style='<style id=iclojure-style>\
  .iclj {\
    font-family: monospace;\
  }\
  .iclj .class {color: orange;}\
  .iclj.iclj  .keyword {color: teal; font-weight: bold;}\
  .iclj * { padding: 0; margin: 0; }\
  /* collapse expand */\
  .iclj li {\
    cursor: default;\
  }\
  .iclj li:first-child {\
    cursor: pointer;\
  }\
  .iclj ul{\
    display: inline-block;\
    vertical-align: top;\
    white-space: pre-line;\
  }\
  .iclj li.expanded + li::before {\
    content:"\\A";\
    white-space: pre;\
  }\
  .iclj li.expanded > ul > li + li.trail::before {\
    content:"";\
  }\
  .iclj li.collapsed > ul > li {\
    display: none;\
  }\
  .iclj li.collapsed > ul > li::before {\
    content: "\\22EF";\
    font-weight: bold;\
    color: #aaa;\
  }\
  .iclj li.collapsed > ul > li.trail {\
    display: inline;\
  }\
  .iclj li{\
    display: inline;\
    vertical-align: top;\
    white-space: pre;\
  }\
  .iclj li.space {\
    white-space: pre-line;\
  }\
  .iclj li.string > ul > li {\
    white-space: pre-wrap;\
  }\
  .iclj li.expanded > ul > li.space::after {\
    content: "\\A";\
    white-space: pre-line;\
  }\
  .iclj li:first-child, .iclj li.trail, .iclj li.expanded > ul > li, .iclj li.expanded + li {\
    padding-left: 0;\
  }\
  .iclj li.ns::before {\
    content: "ns";\
    vertical-align: top;\
    font-size: 50%;\
  }\
  .iclj li.browser::before {\
    content: "\\1F50D";\
    font-size: 50%;\
  }\
  .iclj li.browser + li {\
    display: none;\
  }\
  .iclj li.browser.expanded::before {\
    content: "\\1F50E";\
  }\
  .iclj li.browser.expanded + li {\
    display: inline;\
  }\
  .iclj li.browser.expanded ~ li::before {\
    content:"\\A\\00A0\\00A0";\
    white-space: pre;\
  }\
  /*  */\
  .iclj .elision {\
    cursor: pointer;\
    color: blue;\
    text-decoration: underline;\
  }\
  .iclj .elision-deadend {\
    color: red;\
    cursor: not-allowed;\
  }\
</style>';
module.exports = [{
    id: 'iclojure_extension',
    autoStart: true,
    requires: [mime.IRenderMimeRegistry],
    activate: function(app, reg) {
      console.log('JupyterLab extension iclojure_extension is activated!');
      let shared_state = {pending: {}}; // use a promise? lifecycles are not clear.
      window.jupiler = shared_state;
      document.head.insertAdjacentHTML('beforeend', style);
      reg.addFactory({
        safe: true,
        mimeTypes: ["text/iclojure-html"],
        createRenderer: options => new OutputWidget(options, shared_state)
      });
      app.docRegistry.addWidgetExtension('Notebook', {createNew: function(a, context) { shared_state.context = context; }});
    }
}];
})();
