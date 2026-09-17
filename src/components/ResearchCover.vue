<script setup>
import UiIcon from "./UiIcon.vue";
defineProps({ mission: { type: Object, default: null }, loading: Boolean, error: { type: String, default: "" } });
defineEmits(["explore", "create", "open", "retry"]);
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="eyebrow"><span class="editorial-line"></span> AN OPEN FIELD FOR CURIOUS MINDS</div>
      <h1 id="hero-title">Less noise.<br />More <em>evidence.</em></h1>
      <p>A home for questions worth asking. Explore open research, follow the sources, and turn your curiosity into a useful contribution.</p>
      <div class="hero-actions">
        <button class="button primary" @click="$emit('explore')">Explore missions<UiIcon name="arrow" :size="18" /></button>
        <button class="text-button" @click="$emit('create')">Create a mission<UiIcon name="plus" :size="17" /></button>
      </div>
      <div class="hero-caption"><span class="caption-cross" aria-hidden="true">✳</span><p>Independent thinking.<br /><strong>Shared understanding.</strong></p></div>
    </div>
    <div class="fieldbook-cover">
      <div class="cover-heading"><span>THE OPEN RESEARCH FIELDBOOK</span><span>VOL. 001</span></div>
      <div class="fieldbook-art" aria-hidden="true">
        <svg viewBox="0 0 480 330" fill="none">
          <defs>
            <pattern id="field-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" stroke="#C9BFA9" stroke-width=".6" /></pattern>
            <pattern id="field-lines" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0V6" stroke="#241F22" stroke-width="1.2" /></pattern>
          </defs>
          <rect x="24" y="10" width="432" height="300" fill="url(#field-grid)" />
          <circle cx="269" cy="164" r="124" fill="#D84A2F" />
          <circle cx="269" cy="164" r="89" stroke="#F6F1E7" stroke-opacity=".55" />
          <circle cx="269" cy="164" r="54" stroke="#F6F1E7" stroke-opacity=".55" />
          <path d="M269 23V305M128 164H410" stroke="#F6F1E7" stroke-opacity=".55" />
          <g transform="rotate(-12 150 169)">
            <path d="M75 64H209L237 93V263H75V64Z" fill="#F6F1E7" stroke="#241F22" stroke-width="1.5" />
            <path d="M209 64V93H237" stroke="#241F22" stroke-width="1.5" />
            <path d="M96 112H153M96 125H193M96 138H177" stroke="#241F22" stroke-width="4" />
            <path d="M96 166H214M96 176H214M96 186H184" stroke="#A69B89" />
            <rect x="96" y="207" width="67" height="33" fill="url(#field-lines)" />
            <circle cx="196" cy="222" r="15" stroke="#D84A2F" stroke-width="2" />
            <path d="m189 222 5 5 10-10" stroke="#D84A2F" stroke-width="2" />
          </g>
          <g transform="rotate(8 354 246)">
            <rect x="300" y="207" width="111" height="74" fill="#F0D990" stroke="#241F22" stroke-width="1.5" />
            <path d="M315 223H355M315 233H389M315 243H376" stroke="#241F22" />
            <path d="m370 258 10-10m-10 0h10v10" stroke="#241F22" stroke-width="2" />
          </g>
          <path d="M69 290H221M370 46H415M415 46V91" stroke="#241F22" stroke-width="1.5" />
          <circle cx="66" cy="290" r="3" fill="#241F22" />
          <path d="M402 75h24m-12-12v24m-8-20 16 16m0-16-16 16" stroke="#241F22" stroke-width="2" />
        </svg>
        <span class="art-annotation">FOLLOW THE QUESTION. FIND THE SOURCE.</span>
      </div>
      <div v-if="loading" class="featured-brief featured-status" role="status"><span class="spinner"></span>Finding the next question…</div>
      <div v-else-if="error" class="featured-brief featured-status"><p>The mission board couldn’t load.</p><button class="text-button" @click="$emit('retry')">Retry loading<UiIcon name="refresh" :size="16" /></button></div>
      <button v-else-if="mission" class="featured-brief" aria-label="Open featured mission" @click="$emit('open', mission)">
        <span class="featured-label">{{ mission.sample ? "ON THE READING DESK / SAMPLE" : "ON THE READING DESK" }}</span>
        <span class="featured-title">{{ mission.title }}</span><span class="featured-arrow"><UiIcon name="arrow" :size="22" /></span>
      </button>
      <div v-else class="featured-brief featured-status"><p>There’s always another question.</p><button class="text-button" @click="$emit('create')">Write the first brief<UiIcon name="plus" :size="16" /></button></div>
    </div>
  </section>
  <div class="research-ribbon" aria-label="Research principles"><span>OPEN QUESTIONS</span><b aria-hidden="true">✳</b><span>TRACEABLE SOURCES</span><b aria-hidden="true">✳</b><span>SHARED PROGRESS</span><b aria-hidden="true">✳</b><span>INDEPENDENT MINDS</span></div>
</template>
