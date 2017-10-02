

import {FormElementType} from 'tdp_core/src/form';

export const FORM_SCALE_FACTOR_ID = 'form.oncoprint.scale';

export const FORM_SCALE_FACTOR = {
  type: FormElementType.INPUT_TEXT,
  label: 'Scale Factor',
  id: FORM_SCALE_FACTOR_ID,
  options: {
    type: 'range'
  },
  attributes: {
    min: 0,
    max: 100,
    step: 1
  },
  useSession: false
};
