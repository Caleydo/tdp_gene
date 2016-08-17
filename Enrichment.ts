/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path="../../tsd.d.ts" />

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, stringCol, numberCol2, useDefaultLayout} from '../targid2/LineUpView';
import {dataSources, all_types, copyNumberVariations, ParameterFormIds} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';

export class Enrichment extends ALineUpView {

  private lineupPromise : Promise<any>;

  private paramForm:FormBuilder;
  private paramDesc:IFormSelectDesc[] = [
    {
      type: FormElementType.SELECT,
      label: 'Data Source',
      id: ParameterFormIds.DATA_SOURCE,
      options: {
        optionsData: dataSources.map((ds) => {
          return {name: ds.name, value: ds.name, data: ds};
        })
      },
      useSession: true
    },
    {
      type: FormElementType.SELECT,
      label: 'Alteration Type',
      id: ParameterFormIds.ALTERATION_TYPE,
      options: {
        optionsData: copyNumberVariations.map((ds) => {
          return {name: ds.name, value: ds.name, data: ds};
        })
      },
      useSession: true
    },
    {
      type: FormElementType.SELECT,
      label: 'Tumor Type',
      id: ParameterFormIds.TUMOR_TYPE,
      dependsOn: [ParameterFormIds.DATA_SOURCE],
      options: {
        optionsFnc: (selection) => selection[0].data.tumorTypesWithAll,
        optionsData: [],
      },
      useSession: true
    }
  ];

  constructor(context:IViewContext, private selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
  }

  init() {
    this.build();
    this.update();
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    // map FormElement change function to provenance graph onChange function
    this.paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(this.paramDesc);

    // add other fields
    super.buildParameterUI($parent.select('form'), onChange);
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    return this.update();
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    return this.update();
  }

  private update() {

    const id = this.selection.range.first;
    const idtype = this.selection.idtype;
    this.setBusy(true);
    return Promise.all([this.lineupPromise, this.resolveId(idtype, id, 'Ensembl')]).then((args) => {
      const gene_name = args[1];
      return ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/enrichment${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
        ensg: gene_name,
        cn: this.getParameter(ParameterFormIds.ALTERATION_TYPE).value,
        tumortype: this.getParameter(ParameterFormIds.TUMOR_TYPE)
      });
    }).then((rows) => {
      // show or hide no data message
      this.$nodata.classed('hidden', rows.length > 0);

      //console.log(rows.length, rows);
      if(rows.length === 0) {
        console.warn('no data --> create a new (empty) LineUp');
        this.lineup.destroy();
        this.build();
        this.lineupPromise.then((d) => {
          this.setBusy(false);
        });

      } else {
        this.replaceLineUpData(rows);
        this.updateMapping('score', rows);
        this.setBusy(false);
      }
    });
  }

  private build() {
    //generate random data
    this.setBusy(true);
    const columns = [
      stringCol('symbol','symbol'),
      numberCol2('score', -3, 3),
    ];
    var lineup = this.buildLineUp([], columns, idtypes.resolve('Ensembl'),(d) => d._id);
    useDefaultLayout(lineup);
    this.initializedLineUp();
    this.setBusy(false);

    this.lineupPromise = Promise.resolve(lineup);
  }
}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new Enrichment(context, selection, parent, options);
}


