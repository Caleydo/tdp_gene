/**
 * Created by Holger Stitz on 07.12.2016.
 */

import {IViewContext, ISelection} from 'ordino/src/View';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {GeneProxyView} from './GeneProxyView';
import {ProxyView} from 'ordino/src/ProxyView';
import {FormElementType, IFormSelectDesc, FormBuilder, IFormSelectElement} from 'ordino/src/FormBuilder';

/**
 * helper view for proxying an existing external website
 */
export class UniProtProxyView extends GeneProxyView {

  protected static SELECTED_UNIPROT_ITEM = 'externalUniProt';

  constructor(context:IViewContext, selection: ISelection, parent:Element, options:any, plugin: IPluginDesc) {
    super(context, selection, parent, options, plugin);
  }

  init() {
    super.init();

    this.$node.classed('proxy_view', true);

    // update the selection first, then update the proxy view
    this.updateSelectedItemSelect()
      .then(() => this.updateUniProtSelect())
      .catch(() => {
        this.updateProxyView();
      })
      .then(() => {
        this.updateProxyView();
      });
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
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'UniProt IDs for Selected Gene',
        id: UniProtProxyView.SELECTED_UNIPROT_ITEM,
        options: {
          optionsData: [],
        },
        useSession: true
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
        .catch(() => {
          this.updateProxyView();
        })
        .then(() => {
          this.updateProxyView();
        });

    } else if(name === UniProtProxyView.SELECTED_UNIPROT_ITEM) {
      this.updateProxyView();
    }
  }

  changeSelection(selection:ISelection) {
    this.selection = selection;

    // update the selection first, then update the proxy view
    this.updateSelectedItemSelect(true) // true = force use last selection
      .then(() => this.updateUniProtSelect(true)) // true = force use last selection
      .catch(() => {
        this.updateProxyView();
      })
      .then(() => {
        this.updateProxyView();
      });
  }

  private updateUniProtSelect(forceUseLastSelection = false) {
    const selectedItemSelect:IFormSelectElement = (<IFormSelectElement>this.paramForm.getElementById(UniProtProxyView.SELECTED_UNIPROT_ITEM));

    return this.resolveIdToNames(this.selection.idtype, this.getParameter(ProxyView.SELECTED_ITEM).data._id, this.options.idtype)
      .then((uniProtIds:string[][]) => {
        // use uniProtIds[0] since we passed only one selected _id
        if(uniProtIds[0] === null) {
          return Promise.reject('Empty list of UniProt IDs');
        } else {
          return Promise.all<any>([uniProtIds[0], this.getUniProtSelectData(uniProtIds[0])]);
        }
      })
      .catch((reject) => {
        selectedItemSelect.setVisible(false);
        selectedItemSelect.updateOptionElements([]);
        return Promise.reject(reject);
      })
      .then((args: any[]) => {
        const uniProtIds = <string[]>args[0]; // use names to get the last selected element
        const data = <{value: string, name: string, data: string}[]>args[1];

        selectedItemSelect.setVisible(true);

        // backup entry and restore the selectedIndex by value afterwards again,
        // because the position of the selected element might change
        const bak = selectedItemSelect.value || data[(<IFormSelectElement>selectedItemSelect).getSelectedIndex()];
        selectedItemSelect.updateOptionElements(data);

        // select last item from incoming `selection.range`
        if(forceUseLastSelection) {
          selectedItemSelect.value = data.filter((d) => d.value === uniProtIds[uniProtIds.length-1])[0];

        // otherwise try to restore the backup
        } else if(bak !== null) {
          selectedItemSelect.value = bak;
        }
      });
  }

  private getUniProtSelectData(uniProtIds): Promise<{value: string, name: string, data: string}[]> {
    if(uniProtIds === null) {
      return Promise.resolve([]);
    }

    return Promise.resolve(uniProtIds.map((d:string) => {
      return {value: d, name: d, data: d};
    }));
  }

  protected updateProxyView() {
    this.loadProxyPage(this.getParameter(UniProtProxyView.SELECTED_UNIPROT_ITEM).value);
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options, plugin: IPluginDesc) {
  return new UniProtProxyView(context, selection, parent, options, plugin);
}
