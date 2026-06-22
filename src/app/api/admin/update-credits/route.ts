import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
    try {
        const data = await request.json();
        const payload = {
            enabled: data.enabled,
            search_quota_monthly: data.search_quota_monthly,
            export_quota_monthly: data.export_quota_monthly,
            export_row_cap: data.export_row_cap,
            enrichment_quota_monthly: data.enrichment_quota_monthly,
            override_reason: data.override_reason
        }
        const response = await AXIOS.patch(`/api/v1/admin/users/${data?.user_id}/quotas`, payload);
        return NextResponse.json({ data: response.data }, { status: 200 });
    } catch (error: unknown) {
        console.error("error", error)
        if (error instanceof AxiosError) {
            let errorData = error?.response?.data;
            if (typeof errorData === 'object') {
                errorData = JSON.stringify(errorData);
            }
            return NextResponse.json(
                { error: errorData || 'An error occurred' },
                {
                    status: error.response?.status || 500
                });
        } else if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, {
                status: 500
            });
        } else {
            return NextResponse.json({ error: error }, {
                status: 500
            });
        }
    }
}