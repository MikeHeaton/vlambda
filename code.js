var cy = cytoscape({
  container: document.getElementById('cy'),
  style: cytoscape.stylesheet()
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
           }),

  boxSelectionEnabled: true,

}); // on tap

var tappedBefore;
var tappedTimeout;
cy.on('tap', function(event) {
  var tappedNow = event.target;
  if (tappedTimeout && tappedBefore) {
    clearTimeout(tappedTimeout);
  }
  if(tappedBefore === tappedNow && tappedNow === cy) {
    cy.trigger('doubleTap', position=event.position);
    tappedBefore = null;
  } else {
    tappedTimeout = setTimeout(function(){ tappedBefore = null; }, 300);
    tappedBefore = tappedNow;
  }
});

cy.on('doubleTap', function(event, pos) {
  console.log(pos);
  cy.add({group: 'nodes', position: pos})});

cy.on('boxselect', 'node', function(event) {
  console.log("foo")
})
