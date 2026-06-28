<script setup lang="ts">
import { computed, ref, type CSSProperties, type Directive } from 'vue';
import katex, { type KatexOptions } from 'katex';

function renderKatex(el: HTMLElement, options?: KatexOptions) {
  const formula = el.getAttribute('data-formula') ?? el.textContent?.trim() ?? '';
  if (formula) {
    katex.render(formula, el, { throwOnError: false, ...options });
  }
}

const vKatex: Directive<HTMLElement, KatexOptions> = {
  mounted(el, { value }) {
    renderKatex(el, value);
  },
  updated(el, { value }) {
    renderKatex(el, value);
  },
};

/**
 * Gamma function implementation based on the Lanczos approximation.
 * https://en.wikipedia.org/wiki/Lanczos_approximation
 */
function Gamma(s: number): number {
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (s < 0.5) {
    return Math.PI / (Math.sin(Math.PI * s) * Gamma(1 - s));
  } else {
    s -= 1;
    let x = p[0]!;
    for (let i = 1; i < p.length; i++) {
      x += p[i]! / (s + i);
    }
    const t = s + g + 0.5;
    return Math.sqrt(2 * Math.PI) * t ** (s + 0.5) * Math.exp(-t) * x;
  }
  // The above use of the reflection (thus the if-else structure) is necessary, even though it may look strange, as it allows to extend the approximation to values of z where Re(z) < 0.5, where the Lanczos method is not valid.
}

/**
 * 计算超椭圆 x^n + y^n = 1 在第一象限的面积。
 * A = (Γ(1 + 1/n))^2 / Γ(1 + 2/n)
 */
function area(n: number): number {
  return Gamma(1 + 1 / n) ** 2 / Gamma(1 + 2 / n);
}

function getK(i: number): number {
  return i / 2;
}

function radiusLinear(K: number): number {
  return Math.max(K, 0);
}

function radiusFixedPoint(K: number): number {
  return 1 / (1 - 2 ** -(2 ** -K)) / (2 + Math.sqrt(2));
}

function radiusFixedPointApproximated(K: number): number {
  return (2 ** K / Math.LN2 + 1 / 2) / (2 + Math.sqrt(2));
}

function radiusFixedArea(K: number): number {
  return (1 / Math.sqrt(1 - area(2 ** K))) * Math.sqrt(1 - Math.PI / 4);
}

function radiusFixedAreaApproximated(K: number): number {
  const zeta3 = 1.2020569031595942; // Apery's constant
  return (
    ((Math.sqrt(6) / Math.PI) * 2 ** K + (6 * Math.sqrt(6) * zeta3) / Math.PI ** 3) *
    Math.sqrt(1 - Math.PI / 4)
  );
}

const radiusFunctions = {
  linear: radiusLinear,
  'fixed-point': radiusFixedPoint,
  'fixed-point-approximated': radiusFixedPointApproximated,
  'fixed-area': radiusFixedArea,
  'fixed-area-approximated': radiusFixedAreaApproximated,
};

const radius = computed<(K: number) => number>(() => radiusFunctions[selectRadiusFunctionId.value]);

function getStyle(K: number): CSSProperties {
  return {
    // @ts-expect-error 暂无类型定义
    cornerTopRightShape: `superellipse(${K})`,
    borderTopRightRadius: `${radius.value(K) * radiusfactor * 100}%`,
    transform: `scale(${scale})`,
    transformOrigin: 'top right',
  };
}

const scale = 12;
const radiusfactor = 1 / 16;
const selectRadiusFunctionId = ref<keyof typeof radiusFunctions>('linear');
const customK = ref<number>(0);
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader description="这是一个测试页面，用于调试和开发。" title="测试页面" />
      <UPageBody>
        <UCard variant="subtle">
          <template #header>
            <UFormField label="半径函数">
              <UTabs
                v-model="selectRadiusFunctionId"
                :items="[
                  {
                    label: 'Linear',
                    value: 'linear',
                  },
                  {
                    label: 'Fixed Point',
                    value: 'fixed-point',
                  },
                  {
                    label: 'Fixed Point Approximated',
                    value: 'fixed-point-approximated',
                  },
                  {
                    label: 'Fixed Area',
                    value: 'fixed-area',
                  },
                  {
                    label: 'Fixed Area Approximated',
                    value: 'fixed-area-approximated',
                  },
                ]"
              >
              </UTabs>
            </UFormField>
          </template>

          <div v-if="selectRadiusFunctionId === 'linear'">
            <p>朴素的经验公式，</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text L}(K) = \max \{ K, 0 \},"
            />
            <p>在 <span v-katex data-formula="1 \le K \le 2" /> 时表现还凑合。</p>
          </div>
          <div v-else-if="selectRadiusFunctionId === 'fixed-point'">
            <p>
              设计思想：让圆角在超椭圆曲线
              <span v-katex data-formula="x^{2^K} + y^{2^K} = 1" />
              与直线
              <span v-katex data-formula="y = x" />
              的交点处保持固定，即当
              <span v-katex data-formula="x = y = 2^{-2^{-K}}" />
              时圆角半径始终为一个常数，从而保证不同
              <span v-katex data-formula="K" />
              下的尖角点在曲线上的位置不变。
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text{FP}}(K) = \dfrac {1} {1 - 2^{-2^{-K}}} \cdot \dfrac {1} {2 + \sqrt{2}}."
            />
          </div>
          <div v-else-if="selectRadiusFunctionId === 'fixed-point-approximated'" class="space-y-2">
            <p>对 Fixed Point 的精确表达式</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\displaystyle r_{\text{FP}}(K) = \dfrac {1} {1 - 2^{-2^{-K}}} \cdot \dfrac {1} {2 + \sqrt{2}},"
            />
            <p>使用 Bernoulli 展开进行近似。</p>
            <p>
              令
              <span v-katex data-formula="x = 2^{-K} \ln 2" />，则
              <span v-katex data-formula="2^{-2^{-K}} = e^{-x}" />，有
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\dfrac {1} {1 - 2^{-2^{-K}}} = \dfrac {1} {1 - e^{-x}}."
            />
            <p>利用 Bernoulli 数的生成函数</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\dfrac {x} {e^x - 1} = \sum_{n=0}^{\infty} \dfrac {B_n x^n} {n!},"
            />
            <p>展开：</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  \dfrac {1} {1 - e^{-x}}
                  &= \dfrac {e^x} {e^x - 1}
                  = 1 + \dfrac {1} {e^x - 1} \\
                  &= 1 + \dfrac {1} {x} \sum_{n=0}^{\infty} \dfrac {B_n x^n} {n!} \\
                  &= 1 + \dfrac {1} {x} \left( 1 - \dfrac {x} {2} + \dfrac {x^2} {12} - \dfrac {x^4} {720} + O(x^6) \right) \\
                  &= \dfrac {1} {x} + \dfrac {1} {2} + \dfrac {x} {12} - \dfrac {x^3} {720} + O(x^5).
                \end{aligned}
              "
            />
            <p>
              代入
              <span v-katex data-formula="x = 2^{-K} \ln 2" />，保留到
              <span v-katex data-formula="x" /> 的一阶项：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  \dfrac {1} {1 - 2^{-2^{-K}}}
                  &= \dfrac {1} {x} + \dfrac {1} {2} + \dfrac {x} {12} + O \! \left( x^3 \right) \\
                  &= \dfrac {2^K} {\ln 2} + \dfrac {1} {2} + \dfrac {\ln 2} {12} 2^{-K} + O \! \left( 2^{-2K} \right).
                \end{aligned}
              "
            />
            <p>代回 <span v-katex data-formula="r_{\text{FP}}(K)" /> 表达式：</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text{FP}}(K) = \left( \dfrac {2^K} {\ln 2} + \dfrac {1} {2} + \dfrac {\ln 2} {12} 2^{-K} + O \! \left( 2^{-2K} \right) \right) \cdot \dfrac {1} {2 + \sqrt{2}}."
            />
            <p>
              截断
              <span v-katex data-formula="O \! \left( 2^{-K} \right)" /> 及更高阶项，得到 FPA
              近似表达式：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text{FPA}}(K) = \left( \dfrac {2^K} {\ln 2} + \dfrac {1} {2} \right) \cdot \dfrac {1} {2 + \sqrt{2}}."
            />
          </div>
          <div v-else-if="selectRadiusFunctionId === 'fixed-area'" class="space-y-2">
            <p>设计思想：超椭圆曲线</p>
            <span v-katex="{ displayMode: true }" data-formula="x^{2^K} + y^{2^K} = 1" />
            <p>
              在第一象限内与坐标轴围成的面积为
              <span v-katex data-formula="A(2^K)" />。单位正方形
              <span v-katex data-formula="[0, 1] \times [0, 1]" />
              中曲线外的角部面积为
            </p>
            <span v-katex="{ displayMode: true }" data-formula="S(K) = 1 - A(2^K)." />
            <p>
              Fixed Area 方法保持半径
              <span v-katex data-formula="r" />
              与角部面积平方根
              <span v-katex data-formula="\sqrt{S(K)}" />
              的乘积为常数，归一化到
              <span v-katex data-formula="K = 1" />
              时的圆形超椭圆（此时
              <span v-katex data-formula="r = 1" />，
              <span v-katex data-formula="A(2) = \dfrac {\pi} {4}" />）：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r(K) \cdot \sqrt{1 - A(2^K)} = 1 \cdot \sqrt{1 - \dfrac {\pi} {4}}."
            />
            <p>因此</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text{FA}}(K) = \dfrac {\sqrt{1 - \dfrac {\pi} {4}}} {\sqrt{1 - A(2^K)}}."
            />
            <p>其中超椭圆第一象限面积由曲线积分给出：</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="A(n) = \int_0^1 y \, \mathrm{d}x = \int_0^1 (1 - x^n)^{\frac {1} {n}} \, \mathrm{d}x."
            />
            <p>
              作代换
              <span v-katex data-formula="t = x^n" />，则
              <span v-katex data-formula="x = t^{\frac {1} {n}}" />，
              <span
                v-katex
                data-formula="\mathrm{d}x = \dfrac {1} {n} t^{\frac {1} {n} - 1} \, \mathrm{d}t"
              />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  A(n)
                  &= \int_0^1 (1 - t)^{\frac {1} {n}} \cdot \dfrac {1} {n} t^{\frac {1} {n} - 1} \, \mathrm{d}t \\
                  &= \dfrac {1} {n} \int_0^1 t^{\frac {1} {n} - 1} (1 - t)^{\left( \frac {1} {n} + 1 \right) - 1} \, \mathrm{d}t.
                \end{aligned}
              "
            />
            <p>
              化为 Beta 函数
              <span
                v-katex
                data-formula="\displaystyle \mathrm B(a, b) = \int_0^1 t^{a-1} (1 - t)^{b-1} \, \mathrm{d}t = \dfrac {\Gamma(a) \Gamma(b)} {\Gamma(a + b)}"
              />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="A(n) = \dfrac {1} {n} \, \mathrm B \!\left( \dfrac {1} {n}, \dfrac {1} {n} + 1 \right)."
            />
            <p>代入 Beta–Gamma 关系：</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  A(n)
                  &= \dfrac {1} {n} \cdot
                    \dfrac {\Gamma\!\left( \dfrac {1} {n} \right)
                           \Gamma\!\left( \dfrac {1} {n} + 1 \right)}
                           {\Gamma\!\left( \dfrac {2} {n} + 1 \right)} \\
                  &= \dfrac {1} {n} \cdot
                    \dfrac {\Gamma\!\left( \dfrac {1} {n} \right) \cdot
                           \dfrac {1} {n} \Gamma\!\left( \dfrac {1} {n} \right)}
                           {\dfrac {2} {n} \Gamma\!\left( \dfrac {2} {n} \right)} \\
                  &= \dfrac {\Gamma\!\left( \dfrac {1} {n} \right)^2}
                           {2n \, \Gamma\!\left( \dfrac {2} {n} \right)}.
                \end{aligned}
              "
            />
            <p>
              利用
              <span v-katex data-formula="\Gamma(z + 1) = z \Gamma(z)" />
              改写为代码中的形式：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="A(n) = \dfrac {\Gamma \!\left( 1 + \dfrac {1} {n} \right) ^ 2} {\Gamma \!\left( 1 + \dfrac {2} {n} \right)}."
            />
          </div>
          <div v-else-if="selectRadiusFunctionId === 'fixed-area-approximated'" class="space-y-2">
            <p>对 Fixed Area 的表达式</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text{FA}}(K) = \dfrac {\sqrt{1 - \dfrac {\pi} {4}}} {\sqrt{1 - A(2^K)}}"
            />
            <p>
              中的
              <span v-katex data-formula="\dfrac {1} {\sqrt{1 - A(2^K)}}" />
              部分使用渐近展开进行近似。
            </p>
            <p>
              令
              <span v-katex data-formula="z = 2^{-K} = \dfrac {1} {n}" />，利用
              <span v-katex data-formula="\ln \Gamma(1 + z)" /> 在
              <span v-katex data-formula="z = 0" /> 附近的级数展开
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\ln \Gamma(1 + z) = -\gamma z + \sum_{k = 2}^{\infty} \dfrac {(-1)^k \zeta(k)} {k} z^k,"
            />
            <p>
              代入 <span v-katex data-formula="\zeta(2) = \dfrac {\pi^2} {6}" />、
              <span v-katex data-formula="\zeta(3)" /> 得
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\ln \Gamma(1 + z) = -\gamma z + \dfrac {\pi^2} {12} z^2 - \dfrac {\zeta(3)} {3} z^3 + \dfrac {\pi^4} {360} z^4 + O(z^5)."
            />
            <p>
              将 <span v-katex data-formula="z" /> 替换为 <span v-katex data-formula="2z" />，得
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\ln \Gamma(1 + 2z) = -2\gamma z + \dfrac {\pi^2} {3} z^2 - \dfrac {8 \zeta(3)} {3} z^3 + \dfrac {16 \pi^4} {360} z^4 + O(z^5)."
            />
            <p>
              计算
              <span
                v-katex
                data-formula="\ln A(2^K) = 2 \ln \Gamma(1 + z) - \ln \Gamma(1 + 2z)"
              />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  \ln A
                  &= 2 \left( -\gamma z + \dfrac {\pi^2} {12} z^2 - \dfrac {\zeta(3)} {3} z^3 + \dfrac {\pi^4} {360} z^4 \right) \\
                  &\qquad - \left( -2\gamma z + \dfrac {\pi^2} {3} z^2 - \dfrac {8 \zeta(3)} {3} z^3 + \dfrac {2\pi^4} {45} z^4 \right) + O(z^5) \\
                  &= \left( -2\gamma z + 2\gamma z \right)
                     + \left( \dfrac {\pi^2} {6} - \dfrac {\pi^2} {3} \right) z^2
                     + \left( -\dfrac {2 \zeta(3)} {3} + \dfrac {8 \zeta(3)} {3} \right) z^3 \\
                  &\qquad + \left( \dfrac {\pi^4} {180} - \dfrac {2\pi^4} {45} \right) z^4
                     + O(z^5) \\
                  &= -\dfrac {\pi^2} {6} z^2 + 2 \zeta(3) z^3 - \dfrac {7\pi^4} {180} z^4 + O(z^5).
                \end{aligned}
              "
            />
            <p>
              指数化，利用
              <span v-katex data-formula="\exp(X) = 1 + X + \dfrac {X^2} {2} + O(X^3)" />， 令
              <span
                v-katex
                data-formula="X = -\dfrac {\pi^2} {6} z^2 + 2 \zeta(3) z^3 - \dfrac {7\pi^4} {180} z^4 + O(z^5)"
              />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  A
                  &= \exp\!\left( -\dfrac {\pi^2} {6} z^2 + 2 \zeta(3) z^3 - \dfrac {7\pi^4} {180} z^4 + O(z^5) \right) \\
                  &= 1 + \left( -\dfrac {\pi^2} {6} z^2 + 2 \zeta(3) z^3 - \dfrac {7\pi^4} {180} z^4 \right)
                     + \dfrac {1} {2} \left( -\dfrac {\pi^2} {6} z^2 \right)^2 + O(z^5) \\
                  &= 1 - \dfrac {\pi^2} {6} z^2 + 2 \zeta(3) z^3
                     + \left( -\dfrac {7\pi^4} {180} + \dfrac {\pi^4} {72} \right) z^4 + O(z^5) \\
                  &= 1 - \dfrac {\pi^2} {6} z^2 + 2 \zeta(3) z^3 - \dfrac {\pi^4} {40} z^4 + O(z^5).
                \end{aligned}
              "
            />
            <p>因此</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="1 - A = \dfrac {\pi^2} {6} z^2 - 2 \zeta(3) z^3 + \dfrac {\pi^4} {40} z^4 + O(z^5)."
            />
            <p>提取因子 <span v-katex data-formula="\dfrac {\pi^2} {6} z^2" />：</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="1 - A = \dfrac {\pi^2} {6} z^2 \left( 1 - \dfrac {12 \zeta(3)} {\pi^2} z + \dfrac {3\pi^2} {20} z^2 + O(z^3) \right)."
            />
            <p>
              利用二项式展开
              <span
                v-katex
                data-formula="(1 + u)^{-1/2} = 1 - \dfrac {1} {2} u + \dfrac {3} {8} u^2 + O(u^3)"
              />，令
              <span
                v-katex
                data-formula="u = -\dfrac {12 \zeta(3)} {\pi^2} z + \dfrac {3\pi^2} {20} z^2 + O(z^3)"
              />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  \dfrac {1} {\sqrt{1 - A}}
                  &= \dfrac {\sqrt{6}} {\pi} \cdot \dfrac {1} {z} \left( 1 - \dfrac {12 \zeta(3)} {\pi^2} z + \dfrac {3\pi^2} {20} z^2 + O(z^3) \right)^{-1/2} \\
                  &= \dfrac {\sqrt{6}} {\pi} \cdot \dfrac {1} {z}
                    \left( 1
                      - \dfrac {1} {2} \left( -\dfrac {12 \zeta(3)} {\pi^2} z + \dfrac {3\pi^2} {20} z^2 \right) + \dfrac {3} {8} \left( -\dfrac {12 \zeta(3)} {\pi^2} z \right)^2
                      + O(z^3) \right) \\
                  &= \dfrac {\sqrt{6}} {\pi} \cdot \dfrac {1} {z}
                    \left( 1 + \dfrac {6 \zeta(3)} {\pi^2} z
                      + \left( \dfrac {54 \zeta(3)^2} {\pi^4} - \dfrac {3\pi^2} {40} \right) z^2
                      + O(z^3) \right) \\
                  &= \dfrac {\sqrt{6}} {\pi} \cdot \dfrac {1} {z}
                     + \dfrac {6 \sqrt{6} \zeta(3)} {\pi^3}
                     + \dfrac {\sqrt{6}} {\pi} \left( \dfrac {54 \zeta(3)^2} {\pi^4} - \dfrac {3\pi^2} {40} \right) z
                     + O(z^2).
                \end{aligned}
              "
            />
            <p>
              代回
              <span v-katex data-formula="z = 2^{-K}" />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="\dfrac {1} {\sqrt{1 - A(2^K)}} = \dfrac {\sqrt{6}} {\pi} 2^K + \dfrac {6 \sqrt{6} \zeta(3)} {\pi^3} + \dfrac {\sqrt{6}} {\pi} \left( \dfrac {54 \zeta(3)^2} {\pi^4} - \dfrac {3\pi^2} {40} \right) 2^{-K} + O(2^{-2K})."
            />
            <p>
              代入
              <span v-katex data-formula="r_{\text{FA}}(K)" /> 表达式，乘上因子
              <span v-katex data-formula="\sqrt{1 - \dfrac {\pi} {4}}" />：
            </p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="
                \begin{aligned}
                  r_{\text{FA}}(K)
                  = \left( \dfrac {\sqrt{6}} {\pi} 2^K
                       + \dfrac {6 \sqrt{6} \zeta(3)} {\pi^3} + \dfrac {\sqrt{6}} {\pi} \left( \dfrac {54 \zeta(3)^2} {\pi^4} - \dfrac {3\pi^2} {40} \right) 2^{-K}
                       + O(2^{-2K}) \right) \sqrt{1 - \dfrac {\pi} {4}}.
                \end{aligned}
              "
            />
            <p>截断 <span v-katex data-formula="O(2^{-K})" /> 及更高阶项，得到 FAA 近似表达式：</p>
            <span
              v-katex="{ displayMode: true }"
              data-formula="r_{\text{FAA}}(K) = \left( \dfrac {\sqrt{6}} {\pi} 2^K + \dfrac {6 \sqrt{6} \zeta(3)} {\pi^{3}} \right) \sqrt{1 - \dfrac {\pi} {4}}."
            />
          </div>
        </UCard>

        <UCard variant="subtle">
          <div class="flex flex-wrap gap-2">
            <div v-for="i in 8" :key="i" class="space-y-2">
              <div class="h-32 w-32 overflow-hidden">
                <div class="h-full w-full bg-black dark:bg-white" :style="getStyle(getK(i))" />
              </div>
              <div>
                <p>{{ `K = ${getK(i).toFixed(4)}` }}</p>
                <p>{{ `radius = ${radius(getK(i)).toFixed(4)}` }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <UCard variant="subtle">
          <div class="space-y-2">
            <UFormField :hint="customK.toFixed(4)" label="K">
              <USlider v-model="customK" :max="4" :min="-4" :step="Math.pow(2, -16)" />
            </UFormField>
            <div class="h-64 w-64 overflow-hidden">
              <div class="h-full w-full bg-black dark:bg-white" :style="getStyle(customK)" />
            </div>
            <div>
              <p>{{ `K = ${customK.toFixed(4)}` }}</p>
              <p>{{ `radius = ${radius(customK).toFixed(4)}` }}</p>
            </div>
          </div>
        </UCard>

        <UCard variant="subtle">
          <div class="flex items-start gap-6">
            <div class="shrink-0 bg-black p-8">
              <div class="relative h-64 w-64">
                <div v-for="(K, i) in 3" :key="i" class="absolute inset-0 overflow-hidden">
                  <div
                    class="h-full w-full mix-blend-screen"
                    :style="{
                      ...getStyle(K),
                      backgroundColor: `hsl(${(i / 3) * 360}, 100%, 50%)`,
                    }"
                  />
                </div>
              </div>
            </div>
            <div class="space-y-1.5 text-sm">
              <div v-for="(K, i) in 3" :key="i" class="flex items-center gap-2">
                <span
                  class="inline-block h-3 w-3 rounded-sm"
                  :style="{ backgroundColor: `hsl(${(i / 3) * 360}, 100%, 50%)` }"
                />
                <span>K = {{ K.toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </UCard>
        <span
          v-katex="{ displayMode: true }"
          data-formula="
            \begin{equation}
              \begin{split}
                r_{\text{FP}}(K) &= \dfrac {1} {1 - 2^{-2^{-K}}} \cdot \dfrac {1} {2 + \sqrt{2}}, \\
                r_{\text{FPA}}(K) &= \left( \dfrac {2^K} {\ln 2} + \dfrac {1} {2} \right) \cdot \dfrac {1} {2 + \sqrt{2}}, \\
                r_{\text{FA}}(K) &= \dfrac {\sqrt{1 - \dfrac {\pi} {4}}} {\sqrt{1 - A(2^K)}}, \\
                r_{\text{FAA}}(K) &= \left( \dfrac {\sqrt{6}} {\pi} 2^K + \dfrac {6 \sqrt{6} \zeta(3)} {\pi^{3}} \right) \sqrt{1 - \dfrac {\pi} {4}}.
              \end{split}
            \end{equation}
          "
        />
      </UPageBody>
    </UPage>
  </UContainer>
</template>
