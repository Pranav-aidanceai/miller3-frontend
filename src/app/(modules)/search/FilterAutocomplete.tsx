'use client';

import { CodeAutocomplete } from '@/components/CodeAutocomplete';
import { FilterField } from '@/types/search';

interface FilterAutocompleteProps {
    label: string;
    field: FilterField;
    value: string;
    onChange: (code: string) => void;
    placeholder: string;
}

/** The sidebar's code picker. Behaviour lives in {@link CodeAutocomplete}. */
export const FilterAutocomplete = (props: FilterAutocompleteProps) => (
    <CodeAutocomplete {...props} variant="sidebar" />
);
