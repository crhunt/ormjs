/* Initialize ORMJS on page load */

var ormjs;

window.onload = function() {

    ormjs.initialize();

    // Create model
    var model = new ormjs.Model();

    // Initialize web-app utilities
    webapp_utilities();

    // Create SVG
    var view = new ormjs.View({model: model.id, parent: "canvas"});
    view.set_current();

    // Add actions to buttons
    button_actions(view);

    // Draw an initial entity
    new ormjs.Entity({x: 0, y: 0, view: view.id});

}
