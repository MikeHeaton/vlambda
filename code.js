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
  },

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
  selector: 'node[variable="true"]',
  style: {
    'shape': 'diamond',
    'border-width': 5,
    'border-color': 'cyan',
    }
  }
 ],
});

// =====================
// || GRAPH FUNCTIONS ||
// =====================

function getColor(name) {
  // Generate a color for the node named 'name'.

  // We want all numbers to be one color.
  console.log(name, isNaN(name))
  if (!isNaN(name)) {return 'blue';}

  // We want all identically named things to be same color.
  sameName = cy.$("[name= '" + name + "']")
  if (sameName.length > 0) {
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
  console.log("tolisp: ", node)
  if (node.isParent()) {
    // representation is a lambda, or a define.
    var subNodes = node.children()

    // There should be only one top level node.
    var topLevelNode = subNodes.leaves()

    var boundVariables = subNodes.filter("[variable='true']").map(n => n.data("name")).sort();
    var stringedBVars = boundVariables.filter(function (el, i, arr) {
	                                             return arr.indexOf(el) === i;}).join(" ")
    console.log("foo" ,stringedBVars)
    // TODO: distinguish between lambda and define.
    // TODO: deal with zero-arity.
    var openRepr = "(lambda (" + stringedBVars + ") " + toLisp(topLevelNode) + ")"
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

  console.log("repr:", closedRepr)
  return closedRepr

}





// LOAD TEST DATA

var graphJson = JSON.parse('{"elements":{"nodes":[{"data":{"id":"ef53a5e9-fbe4-4e05-bb85-e808c13775d6","name":""},"position":{"x":322,"y":221},"group":"nodes","removed":false,"selected":true,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"id":"255b08de-25aa-442b-bccc-8317b884f870","name":"x","variable":"true","parent":"ef53a5e9-fbe4-4e05-bb85-e808c13775d6"},"position":{"x":367,"y":263},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"id":"eccc53e0-5877-4cc3-9929-0b67fb19c2a3","name":"x","variable":"true","parent":"ef53a5e9-fbe4-4e05-bb85-e808c13775d6"},"position":{"x":277,"y":248},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"id":"72613afa-9acf-4cca-bcfe-dbef02b99c0f","name":"+","parent":"ef53a5e9-fbe4-4e05-bb85-e808c13775d6"},"position":{"x":315,"y":179},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""}],"edges":[{"data":{"source":"255b08de-25aa-442b-bccc-8317b884f870","target":"72613afa-9acf-4cca-bcfe-dbef02b99c0f","id":"7ddbc279-f033-4041-a273-7ac4fe8137d3","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"eccc53e0-5877-4cc3-9929-0b67fb19c2a3","target":"72613afa-9acf-4cca-bcfe-dbef02b99c0f","id":"abc5cfb4-ed70-4e42-b8fd-8692e5000c1f","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""}]},"style":[{"selector":"node","style":{"label":"data(name)","text-valign":"center","color":"white","text-outline-width":"2px","text-outline-color":"blue","background-color":"blue","border-color":"blue","border-width":"2px"}},{"selector":"edge","style":{"curve-style":"bezier","width":"4px","target-arrow-shape":"triangle","line-color":"black","target-arrow-color":"black","target-label":"data(name)","target-text-offset":"20px","color":"white","text-outline-width":"2px","text-outline-color":"black"}},{"selector":"edge:selected","style":{"line-color":"red","target-arrow-color":"green","text-outline-color":"green"}},{"selector":"node:selected","style":{"text-outline-color":"green","border-color":"green"}},{"selector":"$node > node","style":{"background-color":"#bbb","text-valign":"top","text-halign":"center"}},{"selector":"node[variable = \'true\']","style":{"background-color":"cyan","shape":"diamond"}}],"zoomingEnabled":true,"userZoomingEnabled":true,"zoom":1,"minZoom":1e-50,"maxZoom":1e+50,"panningEnabled":true,"userPanningEnabled":true,"pan":{"x":0,"y":0},"boxSelectionEnabled":true,"renderer":{"name":"canvas"}}');
//cy.json(graphJson);

toLisp(cy.$('#673a3132-2fdc-43b0-bcdd-0dd158071d70'))
toLisp(cy.$('#faef976c-a7ba-4323-9ea4-f8daf110bcd6'))
toLisp(cy.$('#2819ebd8-21a8-47fe-bb84-6ab9376122e7'))


/* TODO
- numbered arguments
- Tests
- defun
-- multiline statements (introduces multiple topline nodes :/)
- better deletion
- better addition to blocks

*/
