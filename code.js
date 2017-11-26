// =================
// || GRAPH SETUP ||
// =================

var cy = cytoscape({
  container: document.getElementById('cy'),
  boxSelectionEnabled: true,
  style: [
  {
  selector: 'node',
  style: {
    'content': 'data(name)',
    'text-valign': 'center',
    'text-outline-width': 2,
    'text-outline-color': 'blue',
    'color': 'white',
    'background-color': 'data(mycolor)',
    'border-color': 'blue',
    'border-width': 0,
    }
  },{
  selector: 'edge',
  style: {
    'curve-style': 'bezier',
    'width': 4,
    'target-arrow-shape': 'triangle',
    'line-color': 'black',
    'target-arrow-color': 'black',
    'target-label': 'data(name)',
    'target-text-offset': 20,
    'color': 'white',
    'text-outline-width': 2,
    'text-outline-color': 'black',
    }
  },{
  selector: 'edge:selected',
  style: {
    'line-color': 'red',
    'target-arrow-color': 'red',
    'text-outline-color': 'red',
    }
  },{
  selector: 'node:selected',
  style: {
    //'text-outline-color': 'red',
    //  'background-color': 'red',
    'border-color': 'red',
    'border-width': 5,
    }
  },{
  selector: '$node > node',
  style: {
    'background-color': 'white',
    'text-valign': 'top',
    'text-halign': 'center',
    'border-width': 5,
    'shape': 'roundrectangle'
    }
  },{
  selector: "node[variable='true']",
  style: {
    'shape': 'diamond',
    'border-width': 5,
    'border-color': 'cyan',
    }
  }
]
});

// =====================
// || GRAPH FUNCTIONS ||
// =====================

function getColor(name) {
  // Generate a color for the node named 'name'.
  function isString(name) {
    function matchBrackets(bra, n) {
      console.log(n[0], n[n.length - 1]);
      return (n[0] == bra && n[n.length - 1] == bra);}
    return (matchBrackets('\'', name) || matchBrackets('\"', name) || matchBrackets('\`', name))
  }
  var sameName = cy.$("[name= '" + name + "']");

  // We want all numbers to be one color.
  if (!isNaN(name)) {
    return 'blue';
  }
  // If the name represents a string, make the node green.
  else if (isString(name)) {
    return 'lime';
  }
  // Look for something named the same, and make this node the same color.
  else if (sameName.length > 0) {
    return sameName.data("mycolor")
  }
  // Else generate a random color from the colormap (and convert it to hash).
  else {
    return '#' + interpolateLinearly(Math.random(), prism).map(x => Math.floor(255 * x).toString(16).padStart(2, "0")).join("");
  }
}

function newNode(pos) {
  var name =  window.prompt("name:", "");
  if (!(name === null)) {
    color = getColor(name)
    console.log(color)
    var newNode = cy.add({group: 'nodes',
                        position: pos,
                        data: {mycolor: color}
                      });
    rename(newNode, name);
  }
  return newNode
};

function newEdge(origin, dest) {
  var name =  window.prompt("name:", "");
  if (!(name === null)) {
    var newEdge = cy.add({
            group: "edges",
            style: {'target-arrow-shape': 'triangle'},
            data: {source: origin.id(),
                   target: dest.id()},
            selectable: true
          });
    rename(newEdge, name);
  }
  return newEdge
};

function rename (target, newName=null) {
  if (newName === null) {
    // if no parameter passed, prompt for the name.
    newName = window.prompt("name:", "");
  }
  if (!(newName === null)) {
    target.select();
    target.data('name', newName);
  }
  console.log(target)
  keys_pressed = new Set();
};

function toggleVariable (target) {
  if (!target.data('variable') || target.data('variable') == 'false') {
    target.data('variable', 'true');
  }
  else if (target.data('variable') == 'true') {
    target.data('variable', 'false');
  }
}

// =========================
// || USER INPUT HANDLERS ||
// =========================

// Double-tap to add a new node
var dclick_tappedBefore;
var dclick_tappedTimeout;
cy.on('tap', function(event) {
  var dclick_tappedNow = event.target;
  if (dclick_tappedTimeout && dclick_tappedBefore) {
    clearTimeout(dclick_tappedTimeout);
  }
  if(dclick_tappedBefore === dclick_tappedNow) {
    if(dclick_tappedNow === cy){
      newNode(event.position);
    }
    else {
      rename(event.target);
    }
    dclick_tappedBefore = null;
  } else {
    dclick_tappedTimeout = setTimeout(function(){ dclick_tappedBefore = null; }, 300);
    dclick_tappedBefore = dclick_tappedNow;
  }
});

// Hold 'e' and tap to make a new edge
var newEdge_tappedBefore;
var newEdge_tappedTimeout;
cy.on('select', 'node', function(event) {
  var newEdge_tappedNow = event.target;
  if (newEdge_tappedNow.isNode() && newEdge_tappedBefore && keys_pressed.has('E')) {
    newEdge(newEdge_tappedBefore, newEdge_tappedNow)
  }
  newEdge_tappedBefore = newEdge_tappedNow;
});

// l to 'lambda': wrap selection in a hypernode, containing the selection
// and its closed neighbourhood, corresponding to a lambda function.
Mousetrap.bind('l', function() {
  var parent = newNode();
  var componentz = cy.$('node:selected').closedNeighbourhood() ;
  componentz.forEach(function(component){
    component.move({parent: parent.id()});
    })
  },
  'keypress');

// Backspace to delete selection
Mousetrap.bind('backspace', function() { cy.$(':selected').remove();});

Mousetrap.bind('V', function() { toggleVariable(cy.$(':selected'));});
Mousetrap.bind('P', function() { toLisp(cy.$(':selected'));});

// Recognise keys pressed down
var keys_pressed = new Set()
Mousetrap.bind('E', function() { keys_pressed.add('E');}, 'keypress');
Mousetrap.bind('E', function() { keys_pressed.delete('E');}, 'keyup');

// save & load
function saveState() {
  var fileName = window.prompt("File name:", "")
  if (!(fileName === null)) {
    var jsonData = JSON.stringify(cy.json())
    var a = document.createElement("a");
    var file = new Blob([jsonData], {type: 'text/plain'});
    a.href = URL.createObjectURL(file);
    a.download = fileName + '.txt';
    a.click();
  }
}

function loadState(objectId) {
  var x = document.getElementById(objectId).files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var graphString = e.target.result;
    var graphJson = JSON.parse(graphString);
    console.log(graphJson)
    cy.json(graphJson);
  }
  reader.readAsText(x, "UTF-8");
}

function resetGraph() {
  if (confirm("REALLY CLEAR ALL? (There's no autosave and no undo!)")) {
    console.log("RESET")
    cy.remove(cy.$(""));
  }
}

// ============
// || PARSER ||
// ============

function parse(node) {
  var compiledLisp = toLisp(node);

  function displayResult(lispOutput) {
    var newHtml = /*compiledLisp + " :<br />*/"\>\> " + lispOutput;
    document.getElementById("lispOutput").innerHTML = newHtml;
  }
  var biwa = new BiwaScheme.Interpreter(displayResult)
  biwa.evaluate(compiledLisp, displayResult);
}

function toLisp(node) {
  /* A node is either a:
    - parent === def or lambda, vs primitive
    - sink node === to be evaluated, vs not.*/
  if (node.isParent()) {
    // the node is a lambda, or a define.
    // Evaluate subnodes, defs first.
    var subNodes = node.children()
    var definitionNodes = subNodes.filter(isDefine);
    // Hopefully there's exactly one execution node (?)
    var executionNodes = subNodes.filter(n => (!isDefine(n) && subNodes.leaves().contains(n)));
    console.log("defs", executionNodes)
    // Set up variables of the function.
    var boundVariables = subNodes.filter("[variable='true']").map(n => n.data("name")).sort();
    var stringedBVars = boundVariables.filter(function (el, i, arr) {
	                                             return arr.indexOf(el) === i;}).join(" ")

    // Evaluate definitions
    var definitions = definitionNodes.map(function(ele, i, eles) {return "(define " + ele.data("name")+ " " + toLisp(ele) + ")";});
    var executions = executionNodes.map(function(ele, i, eles) {return toLisp(ele);});
    var runCode = definitions.concat(executions).join("\n")
    console.log("lispdefs:", runCode)

    var openRepr = "(lambda (" + stringedBVars + ") " + runCode + ")";
    /*(
    (lambda (y) (
     (define double (lambda (x) ( (+ x x))))
(double y))) 2)*/
  }
  else {
    var openRepr = node.data("name")
  }

  var inbounds = node.incomers('edge')
  if (inbounds.length > 0) {
    var namedEdges = inbounds.filter('[?name]');
    var stringedNamedEdges = namedEdges
      .sort(function(a,b) {
        return a.data("name").localeCompare(b.data("name"))})
      .map(edge => toLisp(edge.source()));

    var unnamedEdges = inbounds.filter('[!name]');
    var stringedUnnamedEdges = unnamedEdges.map(function(edge) {
      return toLisp(edge.source());
    })

    stringedEdges = stringedNamedEdges.concat(stringedUnnamedEdges).join(" ")
    console.log("namedEdges", stringedEdges)
    var closedRepr = "(" + openRepr + " " + stringedEdges + ")";
  }
  else {
    var closedRepr = openRepr
  }

  console.log("repr:\n", closedRepr)
  return closedRepr

}

// =============
// || HELPERS ||
// =============

function isDefine(node) {
  return (node.isParent() && (node.data("name")) != "");};




// LOAD TEST DATA

var graphString = '{"elements":{"nodes":[{"data":{"mycolor":"blue","id":"9329df10-1d30-4cde-8d4a-2af23812feea","name":""},"position":{"x":262.75,"y":160.5},"group":"nodes","removed":false,"selected":true,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"blue","id":"74101e30-0094-444d-a24d-51dea151a23d","name":"y","parent":"9329df10-1d30-4cde-8d4a-2af23812feea","variable":"true"},"position":{"x":337,"y":172},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#ffd000","id":"07fbcd54-d63d-40b9-844d-201d10dd693c","name":"double","parent":"9329df10-1d30-4cde-8d4a-2af23812feea"},"position":{"x":338,"y":109},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#ffd000","id":"d13c5cc3-3452-465f-b254-6af6f2ce0582","name":"double","parent":"9329df10-1d30-4cde-8d4a-2af23812feea"},"position":{"x":223.5,"y":172.75},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#1ed315","id":"5affa954-4443-49c4-a627-2f1fedd18b1c","name":"x","variable":"true","parent":"d13c5cc3-3452-465f-b254-6af6f2ce0582"},"position":{"x":192,"y":196},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#1ed315","id":"4d1f3c1a-14c0-4dc7-b009-a5908da3954e","name":"x","variable":"true","parent":"d13c5cc3-3452-465f-b254-6af6f2ce0582"},"position":{"x":255,"y":194},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#006aad","id":"ffd686f2-7252-4e70-954a-fc4be6a4bd88","name":"+","parent":"d13c5cc3-3452-465f-b254-6af6f2ce0582"},"position":{"x":223,"y":147},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"blue","id":"24bc44f0-d6e7-4044-83f9-c8cc684a71d7","name":"2"},"position":{"x":282,"y":315},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""}],"edges":[{"data":{"source":"74101e30-0094-444d-a24d-51dea151a23d","target":"07fbcd54-d63d-40b9-844d-201d10dd693c","id":"90ad44c5-36e4-4413-b3e6-45b4a05bbbd2","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"5affa954-4443-49c4-a627-2f1fedd18b1c","target":"ffd686f2-7252-4e70-954a-fc4be6a4bd88","id":"fba2c17f-c590-4aef-b398-e65deec4c856","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"4d1f3c1a-14c0-4dc7-b009-a5908da3954e","target":"ffd686f2-7252-4e70-954a-fc4be6a4bd88","id":"51214555-2336-464d-ad2c-3e4f220c1fc5","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"24bc44f0-d6e7-4044-83f9-c8cc684a71d7","target":"9329df10-1d30-4cde-8d4a-2af23812feea","id":"480acbf7-4b6d-4b1f-bf4a-b6948451b270","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""}]},"style":[{"selector":"node","style":{"label":"data(name)","text-valign":"center","text-outline-width":"2px","text-outline-color":"blue","color":"white","background-color":"data(mycolor)","border-color":"blue","border-width":"0px"}},{"selector":"edge","style":{"curve-style":"bezier","width":"4px","target-arrow-shape":"triangle","line-color":"black","target-arrow-color":"black","target-label":"data(name)","target-text-offset":"20px","color":"white","text-outline-width":"2px","text-outline-color":"black"}},{"selector":"edge:selected","style":{"line-color":"red","target-arrow-color":"red","text-outline-color":"red"}},{"selector":"node:selected","style":{"border-color":"red","border-width":"5px"}},{"selector":"$node > node","style":{"background-color":"white","text-valign":"top","text-halign":"center","border-width":"5px","shape":"roundrectangle"}},{"selector":"node[variable = \'true\']","style":{"shape":"diamond","border-width":"5px","border-color":"cyan"}}],"zoomingEnabled":true,"userZoomingEnabled":true,"zoom":1,"minZoom":1e-50,"maxZoom":1e+50,"panningEnabled":true,"userPanningEnabled":true,"pan":{"x":134,"y":117},"boxSelectionEnabled":true,"renderer":{"name":"canvas"}}';
var graphJson = JSON.parse(graphString);
cy.json(graphJson);
