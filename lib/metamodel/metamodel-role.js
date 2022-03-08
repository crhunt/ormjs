/* 
    Roles in the metamodel.
 */

var ormjs;

ormjs.Role = class {
    id;
    model;
    Name;
    type = "Role";
    IsMandatory = false;
    Multiplicity = "None";
    RolePlayer = null;
    _rboxID;
    _rolenum;
    _factID;
    XML = "";

    constructor(n, rbox) {

        this.model = rbox.model;
        console.log("role model", this.model)
        //this.id = `role-${n.toString()}`;
        this.id = `role-${n}`;
        
        var metamodel = ormjs.models[this.model].metamodel;
        var d = rbox.d3object.datum();

        this.Name = d.name;
        this.IsMandatory = d.mandatory;
        this.Multiplicity = d.multiplicity;
        this.RolePlayer = metamodel.m2mm[ d.entity ];
        this._rboxID = rbox.id;
        this._rolenum = n;
    }

    toXML() {

        /* Add XML representation of the Role. */

        var t = "    ";
        this.XML = `<orm:Role id="${this.id}" _IsMandatory="${this.IsMandatory}" `;
        this.XML += `_Multiplicity="${this.Multiplicity}" Name="${this.Name}">\n`;
        this.XML += `${t}<orm:RolePlayer ref="${this.RolePlayer}" />\n`;
        this.XML += `</orm:Role>`;
    }

    toFact(fact) {

        /* Link the Role to a parent fact. */
        this.id = `${this.id}-${fact.id}`;
        this.Multiplicity = fact._multmap[this.Multiplicity];
        this._factID = fact.id;
    }

}
