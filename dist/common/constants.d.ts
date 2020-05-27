/**
 * Created by Samuel Gratzl on 11.05.2016.
 */
export declare module Categories {
    const copyNumberCat: ({
        value: number;
        name: string;
        color: string;
        border: string;
    } | {
        value: string;
        name: string;
        color: string;
        border: string;
    })[];
    const unknownCopyNumberValue: any;
    const mutationCat: {
        value: string;
        name: string;
        color: string;
        border: string;
    }[];
    const unknownMutationValue: any;
    const GENE_IDTYPE = "Ensembl";
}
