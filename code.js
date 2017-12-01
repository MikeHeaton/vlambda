// =================
// || GRAPH SETUP ||
// =================

//cytoscape.use( require('undo-redo') );
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
    'border-color': 'blue',
    'border-width': 0,
    'background-color': 'data(defaultColor)'
    }
  },{
  selector: '$node > node',
  style: {
    'background-color': 'white',
    'text-valign': 'top',
    'text-halign': 'center',
    'border-width': 5,
    'shape': 'roundrectangle',
    'border-color': 'gray'
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
  selector: "node[?variable]",
  style: {
    'shape': 'diamond',
    'border-width': 5,
    'border-color': 'cyan',
    'background-color': 'cyan'
    }
  },{
    selector: "node:selected[?variable]",
    style: {
      'shape': 'diamond',
      'border-width': 5,
      'background-color': 'cyan',
      'border-color': 'red'
    }
  }
]
});

// =====================
// || GRAPH FUNCTIONS ||
// =====================

function newNode(pos) {
  var name = getName()
  console.log(name)
  console.log(pos)
  if (!(name === null)) {
    var color = getColor(name)
    var createdNode = cy.add({group: 'nodes',
                        position: pos,
                        data: {'variable': false,
                        'name': name,
                        'defaultColor': color}
                      });
    cy.$().deselect();
    createdNode.select();
    return createdNode
  }
};

function newEdge(origin, dest) {
  var newEdge = cy.add({
          group: "edges",
          style: {'target-arrow-shape': 'triangle'},
          data: {source: origin.id(),
                 target: dest.id(),
                 name: name},
          selectable: true
        });
  fixParent(dest);
  //origin.setParent(dest.parent())
  origin.deselect();
  dest.select();
  return newEdge
};

function fixParent(dest) {
  // set origin's parent to dest's parent,
  // and the same for everything origin is attached to.
  var incomers = dest.predecessors("node");
  console.log("incomers:", incomers, "current dest parent", dest.parent())

  incomers.setParent(dest.parent());
}

function getColor(name, node=null) {
  // Method to generate a color for the node that the method is called on.
  function isString(name) {
    function matchBrackets(bra, n) {
      return (n[0] == bra && n[n.length - 1] == bra);}
    return (matchBrackets('\'', name) || matchBrackets('\"', name) || matchBrackets('\`', name))
  }

  if (name != "") {
    if (node === null) {var sameNamedEles = cy.$("[name='" + name + "']");}
    else {var sameNamedEles = cy.$("[name='" + name + "']").difference(node);}

    // Look for something named the same, and make this node the same color.
    if (sameNamedEles.length > 0 && name != "") {
      console.log("found similar", sameNamedEles.data("defaultColor"));
      return sameNamedEles.data("defaultColor");
    }
    // If the name represents a string, make the node green.
    else if (isString(name)) {
      return 'lime';
    }
    // We want numbers (including floats, ints, etc) to be one color.
    else if (!isNaN(name)) {
      return 'blue';
    }
  }

  // Else generate a random color from a colormap (and convert it to hash).
  return '#' + interpolateLinearly(Math.random(), prism).map(x => Math.floor(255 * x).toString(16).padStart(2, "0")).join("");
}
cytoscape('collection', 'getColor', function() {return getColor(this.data('name'), node=this)});

function setColor() {
  color = this.getColor();
  console.log("new color:", color)
  this.data('defaultColor', color);
}
cytoscape('collection', 'setColor', setColor);

function rename(node, newName=null) {
  if (newName === null) {
    newName = getName();
  }
  if (!(newName === null)) {
    node.data('name', newName);
    console.log("name:", node.data('name'))
    node.setColor()
  }
};
cytoscape('collection', 'rename', function(newName=null) {rename(this, newName=newName)});

function setParent(newParent) {
  if (newParent != null && newParent.id()) {
  this.move({parent: newParent.id()})
  }
  else {
    oldParent = this.parent()
    this.move({parent: null})
    if (oldParent.children().length == 0) {
      console.log("deleting rudderless parent")
      oldParent.remove()
    }
  }

}
cytoscape('collection', 'setParent', setParent);

function toggleVariable () {
  this.data('variable', (!this.data('variable')))
  console.log(this.data('variable'))
}
cytoscape('collection', 'toggleVariable', toggleVariable);

// We need to override the 'remove' method so that it doesn't remove children.
// Maybe we can do other interesting stuff too, later?
remove = function (notifyRenderer) {
  removeFromArray = function (arr, ele, manyCopies) {
    for (var i = arr.length; i >= 0; i--) {
      if (arr[i] === ele) {
        arr.splice(i, 1);

        if (!manyCopies) {
          break;
        }
      }
    }
  };

  var self = this;
  var removed = [];
  var elesToRemove = [];
  var elesToRemoveIds = {};
  var cy = self._private.cy;

  if (notifyRenderer === undefined) {
    notifyRenderer = true;
  }

  // add connected edges
  function addConnectedEdges(node) {
    var edges = node._private.edges;
    for (var i = 0; i < edges.length; i++) {
      add(edges[i]);
    }
  }

  /* THIS SECTION REMOVED FROM ORIGINAL
  // add descendant nodes
  function addChildren(node) {
    var children = node._private.children;

    for (var i = 0; i < children.length; i++) {
      add(children[i]);
    }
  }*/

  function add(ele) {
    var alreadyAdded = elesToRemoveIds[ele.id()];
    if (alreadyAdded) {
      return;
    } else {
      elesToRemoveIds[ele.id()] = true;
    }

    if (ele.isNode()) {
      elesToRemove.push(ele); // nodes are removed last

      addConnectedEdges(ele);
      // addChildren(ele);
    } else {
      elesToRemove.unshift(ele); // edges are removed first
    }
  }

  // make the list of elements to remove
  // (may be removing more than specified due to connected edges etc)

  for (var i = 0, l = self.length; i < l; i++) {
    var ele = self[i];

    add(ele);
  }

  function removeEdgeRef(node, edge) {
    var connectedEdges = node._private.edges;

    removeFromArray(connectedEdges, edge);

    // removing an edges invalidates the traversal cache for its nodes
    node.clearTraversalCache();
  }

  function removeParallelRefs(edge) {
    // removing an edge invalidates the traversal caches for the parallel edges
    edge.parallelEdges().clearTraversalCache();
  }

  var alteredParents = [];
  alteredParents.ids = {};

  function removeChildRef(parent, ele) {
    ele = ele[0];
    parent = parent[0];

    var children = parent._private.children;
    var pid = parent.id();

    removeFromArray(children, ele);

    if (!alteredParents.ids[pid]) {
      alteredParents.ids[pid] = true;
      alteredParents.push(parent);
    }
  }

  self.dirtyCompoundBoundsCache();

  cy.removeFromPool(elesToRemove); // remove from core pool

  for (var _i5 = 0; _i5 < elesToRemove.length; _i5++) {
    var _ele3 = elesToRemove[_i5];

    // mark as removed
    _ele3._private.removed = true;

    // add to list of removed elements
    removed.push(_ele3);

    if (_ele3.isEdge()) {
      // remove references to this edge in its connected nodes
      var src = _ele3.source()[0];
      var tgt = _ele3.target()[0];

      removeEdgeRef(src, _ele3);
      removeEdgeRef(tgt, _ele3);
      removeParallelRefs(_ele3);
    } else {
      // remove reference to parent
      var parent = _ele3.parent();

      if (parent.length !== 0) {
        removeChildRef(parent, _ele3);
      }
    }
  }

  // check to see if we have a compound graph or not
  var elesStillInside = cy._private.elements;
  cy._private.hasCompoundNodes = false;
  for (var _i6 = 0; _i6 < elesStillInside.length; _i6++) {
    var _ele4 = elesStillInside[_i6];

    if (_ele4.isParent()) {
      cy._private.hasCompoundNodes = true;
      break;
    }
  }

  if (removed.length > 0) {
    var removedElements = this.cy().$(removed.map(e => '#'+e.id()).join(','));
    console.log(removedElements)
    if (notifyRenderer) {
      this.cy().notify({
        type: 'remove',
        eles: removedElements
      });
    }
    removedElements.emit('remove');
  }

  /*if (removedElements.size() > 0) {
    // must manually notify since trigger won't do this automatically once removed
  }*/

  // the parents who were modified by the removal need their style updated
  for (var _i7 = 0; _i7 < alteredParents.length; _i7++) {
    var _ele5 = alteredParents[_i7];

    if (!_ele5.removed()) {
      _ele5.updateStyle();
    }
  }

  //return new Collection(cy, removed);
};
cytoscape('collection', 'delete', remove);

// =========================
// || USER INPUT HANDLERS ||
// =========================

function getName() {
  newName = window.prompt("name:", "")
  keys_pressed = new Set();
  console.log((newName === null), "nullness", name)
  return newName
}

// Double-tap to add a new node, or press n
var mousePosition = {x:0, y:0};
document.addEventListener('mousemove', function(mouseMoveEvent){
  mousePosition.x = mouseMoveEvent.pageX;
  mousePosition.y = mouseMoveEvent.pageY;
}, false);

Mousetrap.bind('n', function(e) {
  // If all of them belong to the same parent, take them out of the parent.
    pos = mousePosition;
    newNode(Object.assign({}, pos));
});


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

// Hold 'e' and tap a node to make a new edge
cy.on('tap', 'node', function(event) {
  var sources = cy.$('node:selected').difference(event.target)
  if (sources.length > 0 && keys_pressed.has('e')) {
    sources.map(source => newEdge(source, event.target))
  }
});

// l to 'lambda': wrap selection in a hypernode, containing the selection
// and its closed neighbourhood, corresponding to a lambda function.
Mousetrap.bind('l', function() {
  // If all of them belong to the same parent, take them out of the parent.
    var selected = cy.$('node:selected');
    if (selected.parents().length == 1) {
      selected.setParent(null);
    }
    else {
      var parent = newNode();
      var componentz = selected.closedNeighbourhood() ;

      componentz.forEach(function(component){
        component.setParent(parent);
        })
      selected.deselect();
      parent.select();
    }
    var selected = cy.$('node:selected');
    console.log("fixing parent for", selected)
    fixParent(selected);


  },
  'keypress');

// Backspace to delete selection
Mousetrap.bind('backspace', function() { cy.$(':selected').delete ();});

Mousetrap.bind('V', function() { cy.$(':selected').toggleVariable();});
Mousetrap.bind('P', function() { toLisp(cy.$(':selected'));});

// Recognise keys pressed down
var keys_pressed = new Set()
Mousetrap.bind('e', function() { keys_pressed.add('e');}, 'keypress');
Mousetrap.bind('e', function() { keys_pressed.delete('e');}, 'keyup');

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
    //var newHtml = /*compiledLisp + " :<br />*/"\>\> " + lispOutput;
    var newHtml = compiledLisp + " :<br />" + "\>\> " + lispOutput;
    document.getElementById("lispOutput").innerHTML = newHtml;
  }
  var biwa = new BiwaScheme.Interpreter(displayResult)
  biwa.evaluate(compiledLisp, displayResult);
}

function getRef(ele) {
  // Gets name if there is one; else refer to the node by its id.
  var name = ele.data("name");
  return (name != "") ? name : ele.id();
}


function toLisp(node) {
  /* A node is either a:
    - parent === def or lambda, vs primitive
    - sink node === to be evaluated, vs not.*/
  if (node.isParent()) {
    // the node is a lambda, or a define.
    // Evaluate subnodes, defs first.
    var subNodes = node.children()

    // Set up variables of the function.
    var boundVariables = subNodes.filter("[?variable]").map(n => getRef(n)).sort();
    var stringedBVars = boundVariables.filter(function (el, i, arr) {
	                                             return arr.indexOf(el) === i;}).join(" ")

    var definitionNodes = subNodes.filter(isDefine);
    // Hopefully there's exactly one execution node (?)
    var executionNodes = subNodes.filter(n => (!isDefine(n) && subNodes.leaves().contains(n)));

    // Evaluate definitions
    var definitions = definitionNodes.map(function(ele, i, eles) {return "(define " + getRef(ele)+ " " + toLisp(ele) + ")";});
    var executions = executionNodes.map(function(ele, i, eles) {return toLisp(ele);});
    var runCode = definitions.concat(executions).join("\n")

    var openRepr = "(lambda (" + stringedBVars + ") " + runCode + ")";
    /*(
    (lambda (y) (
     (define double (lambda (x) ( (+ x x))))
(double y))) 2)*/
  }
  else {
    var name = node.data("name");
    var openRepr = (name != "") ? name : node.id();
  }

  var inbounds = node.incomers('edge')
  if (inbounds.length > 0) {
    var edgeRefs = inbounds.sort(function(a,b) {
        return getRef(a).localeCompare(getRef(b))})
      .map(edge => toLisp(edge.source()));

    /*
    var namedEdges = inbounds.filter('[?name]');
    var stringedNamedEdges = namedEdges
      .sort(function(a,b) {
        return a.data("name").localeCompare(b.data("name"))})
      .map(edge => toLisp(edge.source()));

    var unnamedEdges = inbounds.filter('[!name]');
    var stringedUnnamedEdges = unnamedEdges.map(function(edge) {
      return toLisp(edge.source());
    })*/
    var stringedEdges = edgeRefs.join(" ")
    // stringedEdges = stringedNamedEdges.concat(stringedUnnamedEdges).join(" ")
    var closedRepr = "(" + openRepr + " " + stringedEdges + ")";
  }
  else {
    var closedRepr = openRepr
  }

  return closedRepr

}

// =============
// || HELPERS ||
// =============

function isDefine(node) {
  return (node.isParent() && (node.data("name")) != "");};


// LOAD TEST DATA
/*
var graphString = '{"elements":{"nodes":[{"data":{"mycolor":"blue","id":"9329df10-1d30-4cde-8d4a-2af23812feea","name":""},"position":{"x":262.75,"y":160.5},"group":"nodes","removed":false,"selected":true,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"blue","id":"74101e30-0094-444d-a24d-51dea151a23d","name":"y","parent":"9329df10-1d30-4cde-8d4a-2af23812feea","variable":"true"},"position":{"x":337,"y":172},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#ffd000","id":"07fbcd54-d63d-40b9-844d-201d10dd693c","name":"double","parent":"9329df10-1d30-4cde-8d4a-2af23812feea"},"position":{"x":338,"y":109},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#ffd000","id":"d13c5cc3-3452-465f-b254-6af6f2ce0582","name":"double","parent":"9329df10-1d30-4cde-8d4a-2af23812feea"},"position":{"x":223.5,"y":172.75},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#1ed315","id":"5affa954-4443-49c4-a627-2f1fedd18b1c","name":"x","variable":"true","parent":"d13c5cc3-3452-465f-b254-6af6f2ce0582"},"position":{"x":192,"y":196},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#1ed315","id":"4d1f3c1a-14c0-4dc7-b009-a5908da3954e","name":"x","variable":"true","parent":"d13c5cc3-3452-465f-b254-6af6f2ce0582"},"position":{"x":255,"y":194},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"#006aad","id":"ffd686f2-7252-4e70-954a-fc4be6a4bd88","name":"+","parent":"d13c5cc3-3452-465f-b254-6af6f2ce0582"},"position":{"x":223,"y":147},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"mycolor":"blue","id":"24bc44f0-d6e7-4044-83f9-c8cc684a71d7","name":"2"},"position":{"x":282,"y":315},"group":"nodes","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""}],"edges":[{"data":{"source":"74101e30-0094-444d-a24d-51dea151a23d","target":"07fbcd54-d63d-40b9-844d-201d10dd693c","id":"90ad44c5-36e4-4413-b3e6-45b4a05bbbd2","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"5affa954-4443-49c4-a627-2f1fedd18b1c","target":"ffd686f2-7252-4e70-954a-fc4be6a4bd88","id":"fba2c17f-c590-4aef-b398-e65deec4c856","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"4d1f3c1a-14c0-4dc7-b009-a5908da3954e","target":"ffd686f2-7252-4e70-954a-fc4be6a4bd88","id":"51214555-2336-464d-ad2c-3e4f220c1fc5","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""},{"data":{"source":"24bc44f0-d6e7-4044-83f9-c8cc684a71d7","target":"9329df10-1d30-4cde-8d4a-2af23812feea","id":"480acbf7-4b6d-4b1f-bf4a-b6948451b270","name":""},"position":{},"group":"edges","removed":false,"selected":false,"selectable":true,"locked":false,"grabbable":true,"classes":""}]},"style":[{"selector":"node","style":{"label":"data(name)","text-valign":"center","text-outline-width":"2px","text-outline-color":"blue","color":"white","background-color":"data(mycolor)","border-color":"blue","border-width":"0px"}},{"selector":"edge","style":{"curve-style":"bezier","width":"4px","target-arrow-shape":"triangle","line-color":"black","target-arrow-color":"black","target-label":"data(name)","target-text-offset":"20px","color":"white","text-outline-width":"2px","text-outline-color":"black"}},{"selector":"edge:selected","style":{"line-color":"red","target-arrow-color":"red","text-outline-color":"red"}},{"selector":"node:selected","style":{"border-color":"red","border-width":"5px"}},{"selector":"$node > node","style":{"background-color":"white","text-valign":"top","text-halign":"center","border-width":"5px","shape":"roundrectangle"}},{"selector":"node[variable = \'true\']","style":{"shape":"diamond","border-width":"5px","border-color":"cyan"}}],"zoomingEnabled":true,"userZoomingEnabled":true,"zoom":1,"minZoom":1e-50,"maxZoom":1e+50,"panningEnabled":true,"userPanningEnabled":true,"pan":{"x":134,"y":117},"boxSelectionEnabled":true,"renderer":{"name":"canvas"}}';
var graphJson = JSON.parse(graphString);
cy.json(graphJson);*/
