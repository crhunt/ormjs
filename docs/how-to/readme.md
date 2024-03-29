# How to build a diagram

## Create a model

```
// Create model
var model = new ormjs.Model();
```

Optional settings:

| Setting | Type | Action |
| --- | --- | --- |
| model.generate_xml | boolean | Generate XML on each change to the model |
| model.xml_target | string | Id of the DOM element innerHTML to receive the generated XML code. |
| model.generate_rel  | boolean | Generate Rel on each change to the model |
| model.rel_target | string | Id of the DOM element innerHTML to receive the generated Rel code. |

## Create a view for the model

Each view must belong to a model. Specify the model by its id.

A view must be contained in a parent DOM element, such as a `div`. Here, the parent has the id "canvas". The size of the view is inherited from the size of the parent element.

```
// Create SVG
var view = new ormjs.View({model: model.id, parent: "canvas"});
```

Only the diagram objects that are generated within a view will be visible in that view. However, the overarching ORM logic will apply across views. Therefore, for example, you may see shadows on objects that only appear once in a view, but appear more than once in the model.

Optional settings:

| Setting | Type | Action |
| --- | --- | --- |
| view.highlight | boolean | Highlight diagram elements not translated to Rel code. |
| view.traversal | boolean | Enable traversal viewing mode. |
| view.traversal_target | string | Id of DOM element innerHTML to receive the traversal data. |

Views may also be generated from SVG data exported from ORMJS. To create a view from a DOM element containing SVG data (in this example, an element with id "canvas"), 

```
var view = ormjs.SVG.activate_view("canvas", _callback);
```

Providing a callback function (`_callback`) is optional. 

To load all ORMJS views on a page,

```
ormjs.SVG.load_page(_callback);
```

Providing a callback function (`_callback`) is optional.

## Draw an entity

Each object must be assigned a view by id and a location in the view. The center of each view is (0,0).

```
// Draw an entity
var entity = new ormjs.Entity({x: 0, y: 0, view: view.id});
```

### Set the entity name

```
entity.d3object.datum().name = "New Name";
entity.update_display_name();
```

### Set the entity reference mode

```
entity.d3object.datum().refmode = "reference mode";
entity.d3object.datum().reftype = "popular"; // or: "unit", "general"
entity.update_display_name();
```

### Make independent

```
entity.d3object.datum().independent = true;
entity.update_display_name();
```

## Draw a value

```
// Draw a value
var value = new ormjs.Value({x: 0, y: 0, view: view.id});
```

### Set the value name

```
value.d3object.datum().name = "New Name";
value.update_display_name();
```

## Draw a predicate

```
// Draw a predicate
var pred = new ormjs.Predicate({x: 0, y: 0, view: view.id});
```

### Flip a predicate

```
pred.flip();
```

### Rotate a predicate

```
pred.rotate();
```

### Add a rolebox to a predicate

```
var rbox = pred.add_rolebox();
```

### Rename the rolebox

```
rbox.d3object.datum().name = "new name"
pred.update_display_name();
```

Note that predicate name is always updated to reflect a combination of the rolebox names.

### Set the reverse reading name for the predicate

```
pred.d3object.datum().rname = "new name";
pred.update_display_name();
```

## Set internal uniqueness constraint (IUC) on rolebox

```
rbox.d3object.datum().multiplicity = "none"; // or: "one", "many", "skip"
rbox.set_internal_uc();
```

Note that it is possible to set combinations of IUCs on a predicate that are disallowed in ORM.

### Toggle mandatory constraint on rolebox true/false

```
rbox.flip_mandatory();
```

## Create an external constraint

```
var const = new ormjs.Constraint({x: 0, y: 0, view: view.id});
```

### Change type of external constraint

```
const.d3object.datum().type = "equality";
const.redraw();
```

Supported constraints: "inclusive-or", "exclusion", "exclusive-or", "equality","identifier", "preferred-identifier", "subset", "external-frequency", and "internal-frequency".

For a constraint with user-defined content:

```
const.d3object.datum().type = "external-frequency";
const.set_content(">= 2");
const.redraw();
```

## Connect objects

Any two objects can be connected via their ID's. The connection type will default to what is allowed between the two objects. Note that the order of objects is important for subtype relationships.

```
var conn = ormjs.Connector.connect_by_id(entity.id, pred.id)
```

## Set subtype connector as preferred

```
conn.d3object.datum().preferred = true; // or: false
conn.draw();
```