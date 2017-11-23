var cy = cytoscape({
  container: document.getElementById('cy'),
  /*style: cytoscape.stylesheet()
       .selector('node')
         .css({
           'font-size': 10,
           'content': 'data(gene_name)',
           'text-valign': 'center',
           'color': 'white',
           'text-outline-width': 2,
           'text-outline-color': '#888',
           'min-zoomed-font-size': 8,
         })
         .selector('node[node_type = "query"]')
           .css({
             'background-color': '#666',
             'text-outline-color': '#666'
           })
         .selector('node:selected')
           .css({
             'color': 'green',
             'text-outline-color': '#000'
           })
           .selector('edge')
             .css({
               'color': 'green',
               'text-outline-color': '#000',
               'target-arrow-shape': 'triangle'
             }),*/

             style: [
   {
     selector: 'node',
     style: {
       'font-size': 10,
       'text-valign': 'center',
       'color': 'white',
       'text-outline-width': 2,
       'text-outline-color': '#888',
       'min-zoomed-font-size': 8,
     }
   },

   {
     selector: 'edge',
     style: {
       'curve-style': 'bezier',
       'width': 4,
       'target-arrow-shape': 'triangle',
       'line-color': '#9dbaea',
       'target-arrow-color': '#9dbaea'
     }
   }
 ],

  boxSelectionEnabled: true,

}); // on tap

var dclick_tappedBefore;
var dclick_tappedTimeout;
cy.on('tap', function(event) {
  var dclick_tappedNow = event.target;
  if (dclick_tappedTimeout && dclick_tappedBefore) {
    clearTimeout(dclick_tappedTimeout);
  }
  if(dclick_tappedBefore === dclick_tappedNow && dclick_tappedNow === cy) {
    cy.trigger('doubleTap', position=event.position);
    dclick_tappedBefore = null;
  } else {
    dclick_tappedTimeout = setTimeout(function(){ dclick_tappedBefore = null; }, 300);
    dclick_tappedBefore = dclick_tappedNow;
  }
});

var newEdge_tappedBefore;
var newEdge_tappedTimeout;
cy.on('tap', 'node', function(event) {
  var newEdge_tappedNow = event.target;
  if (newEdge_tappedNow.isNode() && newEdge_tappedBefore && keys_pressed.has('e')) {
    cy.trigger('newEdge', [newEdge_tappedBefore, newEdge_tappedNow])
  }
  newEdge_tappedBefore = newEdge_tappedNow;
});

cy.on('doubleTap', function(event, pos) {
  console.log(pos);
  cy.add({group: 'nodes', position: pos})});

cy.on('newEdge', function(event, origin, dest) {
  console.log(origin, dest)
  cy.add({group: "edges",
          style: {'target-arrow-shape': 'triangle'},
          data: {source: origin.id(),
                 target: dest.id()}})
});

var keys_pressed = new Set()
Mousetrap.bind('e', function() { keys_pressed.add('e');
                                  console.log(keys_pressed);}, 'keypress');
Mousetrap.bind('e', function() { keys_pressed.delete('e');
                                  console.log(keys_pressed);}, 'keyup');
