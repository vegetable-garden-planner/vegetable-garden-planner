@extends('layouts.admin')

@section('title', '작물 기준정보')
@section('heading', '작물 기준정보를 점검해요')
@section('description', '사용자 추천과 일정 생성에 쓰이는 작물 데이터와 공식 출처를 확인합니다. 현재 편집은 마이그레이션 기준정보로 관리합니다.')

@section('content')
<section class="source-grid" aria-label="기준정보 출처">
    @foreach ($sources as $source)
    <article class="panel source-card">
        <p class="eyebrow">OFFICIAL SOURCE</p>
        <h2>{{ $source->organization }}</h2>
        <p>{{ $source->title }}</p>
        <dl><div><dt>연결 작물</dt><dd>{{ $source->crops_count }}종</dd></div><div><dt>검토일</dt><dd>{{ $source->reviewed_at->format('Y.m.d') }}</dd></div></dl>
        <a href="{{ $source->url }}" target="_blank" rel="noreferrer">원문 확인 ↗</a>
    </article>
    @endforeach
</section>

<section class="panel table-panel">
    <div class="section-head"><div><p class="eyebrow">CROP CATALOG</p><h2>등록 작물 {{ $crops->count() }}종</h2></div><p class="table-note">수정은 `database/data/crops.json`과 마이그레이션으로 공유합니다.</p></div>
    <div class="table-wrap"><table><thead><tr><th>작물</th><th>분류</th><th>과</th><th>난이도</th><th>포기 간격</th><th>출처</th></tr></thead><tbody>
    @foreach ($crops as $crop)
        <tr><td><strong>{{ $crop->name }}</strong><small>{{ $crop->id }}</small></td><td>{{ $crop->category }}</td><td>{{ $crop->family_name }}</td><td>{{ $crop->difficulty }}</td><td>{{ $crop->plant_spacing_cm }}cm</td><td>{{ $crop->source->organization }}</td></tr>
    @endforeach
    </tbody></table></div>
</section>
@endsection
