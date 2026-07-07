import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json({ teamId: null, teamName: null });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.fotmob.com/',
    };

    const response = await axios.get(
      `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(query)}&lang=en`,
      { headers, timeout: 5000 }
    );

    const teamSuggest = response.data?.teamSuggest;
    const option = teamSuggest?.[0]?.options?.[0];

    if (option) {
      const textParts = option.text.split('|');
      const teamName = textParts[0];
      const teamIdStr = option.payload?.id || textParts[1];
      const teamId = teamIdStr ? parseInt(teamIdStr, 10) : null;

      return NextResponse.json({ teamId, teamName });
    }

    return NextResponse.json({ teamId: null, teamName: null });
  } catch (err) {
    console.error('[API/search-team] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
