import { useAppSelector } from '@/store/hooks';

export function useHasScope(scope: string): boolean {
    const scopes = useAppSelector(state => state.auth.roleDetails?.visible_columns);
    return scopes?.includes(scope) ?? false;
}