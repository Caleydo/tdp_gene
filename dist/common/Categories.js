/**
 * Created by Samuel Gratzl on 11.05.2016.
 */
// see also _onco_print.scss
// eslint-disable-next-line @typescript-eslint/no-namespace
export var Categories;
(function (Categories) {
    Categories.copyNumberCat = [
        { value: 2, name: 'Amplification', color: '#efb3bc', border: 'transparent' },
        { value: -2, name: 'Deep Deletion', color: '#92c5de', border: 'transparent' },
        // {value: -1, name: 'Heterozygous deletion', color: '#92c5de'},
        { value: 0, name: 'NORMAL', color: '#dcdcdc', border: 'transparent' },
    ];
    Categories.unknownCopyNumberValue = NaN;
    Categories.mutationCat = [
        { value: 'true', name: 'Mutated', color: '#1BA64E', border: 'transparent' },
        { value: 'false', name: 'Non Mutated', color: '#aaa', border: 'transparent' },
    ];
    Categories.unknownMutationValue = NaN;
    Categories.GENE_IDTYPE = 'Ensembl';
})(Categories || (Categories = {}));
//# sourceMappingURL=Categories.js.map