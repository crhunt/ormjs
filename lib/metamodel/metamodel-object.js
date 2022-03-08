/* 
    Objects in the metamodel.
 */

/* Entity */

ormjs.EntityType = class {
    id;
    model;
    type = "EntityType";
    Name;
    ReferenceMode;
    PlayedRoles = [];
    PreferredIdentifier = "";
    _Shadows;
    _RelName = null;
    _Atom = "";
    XML = "";

    constructor(n,entity) {
        var d = entity.d3object.datum();
        //this.id = `metamodel-object-${n.toString()}`;
        this.id = `object-${n}-${entity.model}`;
        this.model = entity.model;
        this.Name = d.name;
        this.ReferenceMode = d.refmode;
        this.PlayedRoles = entity.plays_roles();
        this._Shadows = [ entity.id ];
    }

    extend(entity) {
        /* Extend the EntityType instance with attributes from shadow, entity */
        // Add shadow
        this._Shadows.push( entity.id );
        // Extend roles
        this.PlayedRoles.push.apply( this.PlayedRoles, entity.plays_roles() );
    }

    toXML() {

        /* Add XML representation of the Object */

        var t = "    ";
        this.XML = `<orm:EntityType id="${this.id}" Name="${this.Name}" _ReferenceMode="${this.ReferenceMode}">\n`;
        this.XML +=`${t}<orm:PlayedRoles>\n`;
        this.PlayedRoles.map( (e) => { this.XML += `${t}${t}<orm:Role ref="${e}" />\n`; } )
        this.XML += `${t}</orm:PlayedRoles>\n`;
        this.XML +=`${t}<orm:PreferredIdentifier ref="${this.PreferredIdentifier}" />\n`;
        this.XML += `</orm:EntityType>`;
    }

}

/* Value */

ormjs.ValueType = class {
    id;
    model;
    type = "ValueType";
    Name;
    PlayedRoles = [];
    ConceptualDataType = "";
    _Shadows;
    _RelName = null;
    _Atom = "";
    XML = "";

    constructor(n,value) {
        var d = value.d3object.datum();
        //this.id = `metamodel-object-${n.toString()}`;
        this.id = `object-${n}-${value.model}`;
        this.model = value.model;
        this.Name = d.name;
        this.PlayedRoles = value.plays_roles();
        this._Shadows = [ value.id ];
    }

    extend(value) {
        
        /* Extend the ValueType instance with attributes from shadow, value */
        
        // Add shadow
        this._Shadows.push( value.id );
        // Extend roles
        this.PlayedRoles.push.apply( this.PlayedRoles, value.plays_roles() );
    }

    toXML() {

        /* Add XML representation of the Object */

        var t = "    ";
        this.XML = `<orm:ValueType id="${this.id}" Name="${this.Name}">\n`;
        this.XML +=`${t}<orm:PlayedRoles>\n`;
        this.PlayedRoles.map( (e) => { this.XML += `${t}${t}<orm:Role ref="${e}" />\n`; } )
        this.XML += `${t}</orm:PlayedRoles>\n`;
        this.XML +=`${t}<orm:ConceptualDataType id="${this.id}-cdt" ref="${this.ConceptualDataType}" />\n`;
        this.XML += `</orm:ValueType>`;
    }

}