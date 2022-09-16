/* Initialize ORMJS on page load */

var ormjs;
var viewparents = [];

window.onload = function() {

    // Create model
    var model = new ormjs.Model();
    model_settings(model);

    view_tabs(model);

    // Initialize web-app utilities
    webapp_utilities();

    // Create SVG
    //var view = new ormjs.View({model: model.id, parent: "canvas"});
    //view.set_current();
    view = create_view(model);

    /*// Add actions to buttons
    view_settings(view);
    button_actions(view);

    // Draw an initial entity
    new ormjs.Entity({x: 0, y: 0, view: view.id});*/

}
