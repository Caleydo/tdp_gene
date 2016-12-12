/**
 * Created by Holger Stitz on 07.12.2016.
 */

import {IViewContext, ISelection} from '../targid2/View';
import {IPluginDesc} from '../caleydo_core/plugin';
import {GeneProxyView} from './GeneProxyView';
import {ProxyView} from '../targid2/ProxyView';
import {FormElementType, IFormSelectDesc, FormBuilder, IFormSelectElement} from '../targid2/FormBuilder';

/**
 * helper view for proxying an existing external website
 */
export class UniProtProxyView extends GeneProxyView {

  protected static SELECTED_UNIPROT_ITEM = 'externalUniProt';

  constructor(context:IViewContext, selection: ISelection, parent:Element, options:any, plugin: IPluginDesc) {
    super(context, selection, parent, options, plugin);
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc:IFormSelectDesc[] = [
      {
        type: FormElementType.SELECT,
        label: 'Gene',
        id: ProxyView.SELECTED_ITEM,
        options: {
          optionsData: [],
        },
        useSession: false
      },
      {
        type: FormElementType.SELECT,
        label: 'UniProt',
        id: UniProtProxyView.SELECTED_UNIPROT_ITEM,
        options: {
          optionsData: [],
        },
        useSession: false
      }
    ];

    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;

    if(name === ProxyView.SELECTED_ITEM) {
      this.updateUniProtSelect()
        .then(() => {
          this.updateProxyView();
        });
    } else {
      this.updateProxyView();
    }
  }

  changeSelection(selection:ISelection) {
    this.selection = selection;

    // update the selection first, then update the proxy view
    this.updateSelectedItemSelect(selection)
      .then(() => this.updateUniProtSelect())
      .then(() => {
        this.updateProxyView();
      });
  }

  private updateUniProtSelect() {
    return this.resolveIdToNames(this.selection.idtype, this.getParameter(ProxyView.SELECTED_ITEM)._id, this.options.idtype)
      .then((uniProtIds:string[][]) => {
        // use uniProtIds[0] since we passed only one selected _id
        return Promise.all<any>([uniProtIds[0], this.getUniProtSelectData(uniProtIds[0])]);
      })
      .then((args) => {
        const uniProtIds = args[0]; // use names to get the last selected element
        const data = args[1];
        const selectedItemSelect = this.paramForm.getElementById(UniProtProxyView.SELECTED_UNIPROT_ITEM);

        (<IFormSelectElement>selectedItemSelect).updateOptionElements(data);

        // select last item from incoming `selection.range`
        selectedItemSelect.value = data.filter((d) => d.value === uniProtIds[uniProtIds.length-1])[0];
      });
  }

  private getUniProtSelectData(uniProtIds) {
    return Promise.resolve(uniProtIds.map((d:string) => {
      return {value: d, name: d, data: d};
    }));
  }

  protected updateProxyView() {
    this.loadProxyPage(this.getParameter(UniProtProxyView.SELECTED_UNIPROT_ITEM));
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options, plugin: IPluginDesc) {
  return new UniProtProxyView(context, selection, parent, options, plugin);
}
