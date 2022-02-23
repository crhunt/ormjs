# ORMJS: Object Role Modeling in JavaScript

> :warning: This project is in active development. Consider this code an alpha prototype. Release notes will be published here.

ORMJS is a completely clientside Object Role Modeling (ORM) solution, accessible from any modern browser. It is implemented in javascript d3v7.

With ORMJS you can:
- Generate ORM diagrams via an intuitive GUI interface.
- Save your ORM diagram as an SVG or PNG.
- Upload SVG files generated by ORMJS and continue editing them.
- Generate Rel code from your ORMJS model.

See a demo of the latest version of ORMJS deployed [here](https://crhunt.github.io/ormjs/).

## What is Object Role Modeling (ORM)

From the [ORM website](http://www.orm.net/):

> Object Role Modeling (ORM) is a powerful method for designing and querying database models at the conceptual level, where the application is described in terms easily understood by non-technical users. In practice, ORM data models often capture more business rules, and are easier to validate and evolve than data models in other approaches.

_Note: Not to be confused with Object Relational Mapping._
## Rel plus ORM

[Rel](https://docs.relational.ai/getting-started/rel/overview/) is an expressive, declarative, and relational language designed for modeling domain knowledge. Rel is used by the RelationalAI Knowledge Graph Management System to create
data models. 

ORMJS generates Rel integrity constraints on-the-fly from the ORM model.

## How to interact with ORMJS

ORMJS is designed to have a minimalist, intuitive user interface. Develop an ORM diagram using the following click events:

| Event | On | Action |
|-------|----|--------|
| RightClick | Canvas | Create object menu |
| Dblclick | Canvas | Generate new entity |
| Shift + Dblclick | Canvas | Generate new fact |
| Ctrl + Shift + Dblclick | Canvas | Generate new value |
| Click + Drag | Canvas | Select multiple objects |
| RightClick | Object | Object context menu |
| Dblclick | Object | Open object property menu |
| Ctrl + Click | Object | Delete object |

Objects can be created and modified using two menus: 
1. the object context menu (access via right-click on the object) and 
2. the object property menu (access via double-click, or via right-click --> Properties).

Objects can be connected by clicking on their overlays and dragging.

## ORM 2 Graphical Notation Checklist

As features are added to ORMJS, track progress here against ORM 2 Graphical Notation standard. The first release and version tracking will begin upon completion of the items here.

Note: Asterisk (&#42;) indicates partial support. Dash (--) indicates no planned support in V1.

| Construct | ORMJS | Rel |
|-----------|-------|-----|
|Entity type |&#9745;|&#9745;|
|Value type |&#9745;|&#9745;|
|Entity type with popular reference mode |&#9745;|&#9745;|
|Entity type with unit-based reference mode |&#9745;|&#9744;|
|Entity type with general reference mode |&#9745;|&#9744;|
|Independent object type |&#9745;|&#9744;|
|External object type |&#9744;|&#9744;|
|Predicate |&#9745;|&#9745;|
|Duplicate type or predicate shape |&#9745;|&#9745;|
|Unary fact type |&#9745;|&#9745;|
|Binary fact type |&#9745;|&#9745;|
|Ternary fact type |&#9745;|&#9745;|
|Quaternary fact type |&#9745;|&#9745;|
|Objectification (aka nesting) |&#9744;|&#9744;|
|Internal uniqueness constraint (UC) on unaries |&#9745;|&#9744;|
|Internal UC on binaries |&#9745;|&#9744;|
|Internal UC on ternaries. For n-aries, each UC must span n-1 roles. |&#9745;|&#9744;|
|Simple mandatory role constraint |&#9745;|&#9745;|
|Inclusive-or constraint |&#9745;|&#9744;|
|Preferred internal UC |&#9745;|&#9744;|
|External UC |&#9745;|&#9744;|
|Object type value constraint |&#9744;|&#9744;|
|Role value constraint |&#9744;|&#9744;|
|Subset constraint |&#9745;|&#9744;|
|Join subset constraint |&#9745;|&#9744;|
|Exclusion constraint |&#9745;|&#9744;|
|Exclusive-or constraint |&#9745;|&#9744;|
|Equality constraint |&#9745;|&#9744;|
|Derived fact type, and derivation rule |--|--|
|Semiderived fact type, and derivation rule |--|--|
|Subtyping |&#9745;|&#9744;|
|Subtyping constraints |&#9745;|&#9744;|
|Subtyping derivation status |--|--|
|Internal frequency constraint |&#9745;|&#9744;|
|External frequency constraint |&#9745;|&#9744;|
|Ring constraints |&#9744;|&#9744;|
|Value comparison constraints |&#9744;|&#9744;|
|Object cardinality constraint |&#9744;|&#9744;|
|Role cardinality constraint |&#9744;|&#9744;|
|Deontic constraints |--|--|
|Textual constraints |--|--|
|Objectification display options |--|--|
## External packages

ORMJS uses [d3-context-menu](https://github.com/patorjk/d3-context-menu). This package is already integrated, nothing additional to download or install.

The ORMJS demo uses [Prism](https://prismjs.com/index.html) to highlight Rel code. This package is already integrated, nothing additional to download or install.