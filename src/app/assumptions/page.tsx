"use client";

import { PageHeader } from "@/components/app-shell";
import { FieldGrid, NumberField } from "@/components/fields";
import { Badge, Button, Callout, Card, ScoreBar } from "@/components/ui";
import { number } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  CONTRACT_STRUCTURES,
  CONTRACT_STRUCTURE_LABELS,
  READINESS_CATEGORIES,
  READINESS_CATEGORY_LABELS,
} from "@/lib/types";

export default function AssumptionsPage() {
  const { ready, assumptions, updateAssumptions, resetAssumptions, resetAll } = useStore();

  if (!ready) return <div className="py-16 text-center text-[13px] text-ink-400">Loading…</div>;

  const a = assumptions;
  const weightTotal = READINESS_CATEGORIES.reduce((s, k) => s + a.readinessWeights[k], 0);

  return (
    <>
      <PageHeader
        title="Assumptions"
        subtitle="Every constant the calculation engine uses lives here. Changing a value re-runs every property immediately."
        actions={
          <>
            <Button onClick={resetAssumptions}>Reset assumptions</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Reset properties, equipment catalog and assumptions to seed data? All edits are lost.")) {
                  resetAll();
                }
              }}
            >
              Reset all data
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Callout tone="accent" title="Design rule">
          No formula in the calculation engine reads a hardcoded constant. If a number matters, it is on this page and the
          operator can change it. The calculation modules import from one assumptions object so that stays true as the
          model grows.
        </Callout>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card
          title="Robot Readiness weights"
          subtitle="Weights are normalized, so they do not have to sum to 100."
          actions={
            <Badge tone={Math.abs(weightTotal - 100) < 0.01 ? "good" : "warn"}>Total {number(weightTotal, 0)}%</Badge>
          }
        >
          <div className="space-y-2.5">
            {READINESS_CATEGORIES.map((key) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3">
                <div>
                  <div className="text-[12.5px] text-ink-700">{READINESS_CATEGORY_LABELS[key]}</div>
                  <ScoreBar score={(a.readinessWeights[key] / Math.max(1, weightTotal)) * 100} tone="accent" height="h-1" />
                </div>
                <input
                  type="number"
                  className="tnum w-full rounded border border-ink-200 px-2 py-1 text-right"
                  value={a.readinessWeights[key]}
                  min={0}
                  aria-label={`${READINESS_CATEGORY_LABELS[key]} weight`}
                  onChange={(e) =>
                    updateAssumptions((d) => {
                      d.readinessWeights[key] = Number(e.target.value) || 0;
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-ink-100 pt-4">
            <FieldGrid cols={3}>
              <NumberField label="Strong candidate min" value={a.readinessBands.strongMin} onChange={(v) => updateAssumptions((d) => { d.readinessBands.strongMin = v; })} min={0} max={100} />
              <NumberField label="Candidate min" value={a.readinessBands.candidateMin} onChange={(v) => updateAssumptions((d) => { d.readinessBands.candidateMin = v; })} min={0} max={100} />
              <NumberField label="Conditional min" value={a.readinessBands.conditionalMin} onChange={(v) => updateAssumptions((d) => { d.readinessBands.conditionalMin = v; })} min={0} max={100} />
            </FieldGrid>
          </div>
        </Card>

        <Card title="Underwriting thresholds" subtitle="The framework the recommendation engine tests against.">
          <FieldGrid cols={2}>
            <NumberField label="Target contribution margin" value={a.thresholds.targetContributionMarginPct} onChange={(v) => updateAssumptions((d) => { d.thresholds.targetContributionMarginPct = v; })} suffix="%" />
            <NumberField label="Conditional contribution margin" value={a.thresholds.conditionalContributionMarginPct} onChange={(v) => updateAssumptions((d) => { d.thresholds.conditionalContributionMarginPct = v; })} suffix="%" />
            <NumberField label="Reject below" value={a.thresholds.rejectContributionMarginPct} onChange={(v) => updateAssumptions((d) => { d.thresholds.rejectContributionMarginPct = v; })} suffix="%" />
            <NumberField label="Target payback" value={a.thresholds.targetPaybackYears} onChange={(v) => updateAssumptions((d) => { d.thresholds.targetPaybackYears = v; })} suffix="yr" step={0.25} />
            <NumberField label="Min machine utilization" value={a.thresholds.minMachineUtilizationPct} onChange={(v) => updateAssumptions((d) => { d.thresholds.minMachineUtilizationPct = v; })} suffix="%" />
            <NumberField label="Max machine utilization" value={a.thresholds.maxMachineUtilizationPct} onChange={(v) => updateAssumptions((d) => { d.thresholds.maxMachineUtilizationPct = v; })} suffix="%" />
            <NumberField
              label="Max acceptable premium"
              value={a.thresholds.maxAcceptablePremiumPct}
              onChange={(v) => updateAssumptions((d) => { d.thresholds.maxAcceptablePremiumPct = v; })}
              suffix="%"
              help="Premium over replaced incumbent spend we believe a customer will actually accept."
            />
          </FieldGrid>
        </Card>

        <Card title="Intervention model" subtitle="How the readiness score translates into an expected intervention rate.">
          <FieldGrid cols={2}>
            <NumberField label="Baseline physical / machine / mo" value={a.interventionModel.baselinePhysicalPerMachineMonth} onChange={(v) => updateAssumptions((d) => { d.interventionModel.baselinePhysicalPerMachineMonth = v; })} step={0.1} />
            <NumberField label="Baseline remote / machine / mo" value={a.interventionModel.baselineRemotePerMachineMonth} onChange={(v) => updateAssumptions((d) => { d.interventionModel.baselineRemotePerMachineMonth = v; })} step={0.1} />
            <NumberField label="Reference readiness score" value={a.interventionModel.referenceReadinessScore} onChange={(v) => updateAssumptions((d) => { d.interventionModel.referenceReadinessScore = v; })} />
            <NumberField label="Readiness sensitivity" value={a.interventionModel.readinessSensitivity} onChange={(v) => updateAssumptions((d) => { d.interventionModel.readinessSensitivity = v; })} step={0.05} help="Rate change per 25 readiness points." />
            <NumberField label="Min multiplier" value={a.interventionModel.minMultiplier} onChange={(v) => updateAssumptions((d) => { d.interventionModel.minMultiplier = v; })} step={0.05} />
            <NumberField label="Max multiplier" value={a.interventionModel.maxMultiplier} onChange={(v) => updateAssumptions((d) => { d.interventionModel.maxMultiplier = v; })} step={0.05} />
          </FieldGrid>
        </Card>

        <Card title="Labor" subtitle="All rates are pre-burden; the burden multiplier is applied by the engine.">
          <FieldGrid cols={2}>
            <NumberField label="Field technician" value={a.labor.fieldTechHourlyCost} onChange={(v) => updateAssumptions((d) => { d.labor.fieldTechHourlyCost = v; })} suffix="$/hr" />
            <NumberField label="Remote technician" value={a.labor.remoteTechHourlyCost} onChange={(v) => updateAssumptions((d) => { d.labor.remoteTechHourlyCost = v; })} suffix="$/hr" />
            <NumberField label="Labor burden multiplier" value={a.labor.laborBurdenMultiplier} onChange={(v) => updateAssumptions((d) => { d.labor.laborBurdenMultiplier = v; })} suffix="×" step={0.05} />
            <NumberField label="Travel cost (tech + vehicle)" value={a.labor.travelHourlyCost} onChange={(v) => updateAssumptions((d) => { d.labor.travelHourlyCost = v; })} suffix="$/hr" />
            <NumberField label="Trip batching factor" value={a.labor.tripBatchingFactor} onChange={(v) => updateAssumptions((d) => { d.labor.tripBatchingFactor = v; })} step={0.05} help="Trips per unplanned intervention. Below 1 means issues get batched onto one dispatch." />
          </FieldGrid>
        </Card>

        <Card title="Capital" subtitle="Cost of capital, financing and redeployment.">
          <FieldGrid cols={2}>
            <NumberField label="Cost of capital" value={a.capital.costOfCapitalPct} onChange={(v) => updateAssumptions((d) => { d.capital.costOfCapitalPct = v; })} suffix="%" step={0.5} />
            <NumberField label="Finance term" value={a.capital.financeTermYears} onChange={(v) => updateAssumptions((d) => { d.capital.financeTermYears = v; })} suffix="yr" />
            <NumberField label="Finance APR" value={a.capital.financeApr} onChange={(v) => updateAssumptions((d) => { d.capital.financeApr = v; })} suffix="%" step={0.5} />
            <NumberField label="Default useful life" value={a.capital.defaultUsefulLifeYears} onChange={(v) => updateAssumptions((d) => { d.capital.defaultUsefulLifeYears = v; })} suffix="yr" />
            <NumberField label="Redeployment cost per machine" value={a.capital.redeploymentCostPerMachine} onChange={(v) => updateAssumptions((d) => { d.capital.redeploymentCostPerMachine = v; })} suffix="$" />
            <NumberField label="Redeployment idle period" value={a.capital.redeploymentIdleMonths} onChange={(v) => updateAssumptions((d) => { d.capital.redeploymentIdleMonths = v; })} suffix="mo" />
          </FieldGrid>
        </Card>

        <Card title="Fleet operating cost">
          <FieldGrid cols={2}>
            <NumberField label="Monitoring / connectivity" value={a.fleetOpex.monitoringConnectivityPerMachineYear} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.monitoringConnectivityPerMachineYear = v; })} suffix="$/mach/yr" />
            <NumberField label="Insurance" value={a.fleetOpex.insurancePctOfCapitalPerYear} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.insurancePctOfCapitalPerYear = v; })} suffix="% cap/yr" step={0.25} />
            <NumberField label="Repairs" value={a.fleetOpex.repairsPctOfCapitalPerYear} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.repairsPctOfCapitalPerYear = v; })} suffix="% cap/yr" step={0.25} />
            <NumberField label="Battery / replacement reserve" value={a.fleetOpex.batteryReservePctOfCapitalPerYear} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.batteryReservePctOfCapitalPerYear = v; })} suffix="% cap/yr" step={0.25} />
            <NumberField label="Consumables" value={a.fleetOpex.consumablesPerMachineYear} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.consumablesPerMachineYear = v; })} suffix="$/mach/yr" />
            <NumberField label="Blade set cost" value={a.fleetOpex.bladeSetCost} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.bladeSetCost = v; })} suffix="$" />
            <NumberField label="Storage / winterization" value={a.fleetOpex.storageWinterizationPerMachineYear} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.storageWinterizationPerMachineYear = v; })} suffix="$/mach/yr" />
            <NumberField label="Spare ratio" value={a.fleetOpex.spareRatio} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.spareRatio = v; })} step={0.01} help="Spares held per live machine." />
            <NumberField label="Spare floor threshold" value={a.fleetOpex.minSparesThresholdMachines} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.minSparesThresholdMachines = v; })} suffix="machines" step={1} />
            <NumberField label="Variable administration" value={a.fleetOpex.variableAdminPctOfRevenue} onChange={(v) => updateAssumptions((d) => { d.fleetOpex.variableAdminPctOfRevenue = v; })} suffix="% revenue" step={0.5} />
          </FieldGrid>
        </Card>

        <Card title="Deployment / commissioning">
          <FieldGrid cols={2}>
            <NumberField label="Site survey" value={a.deployment.siteSurveyHours} onChange={(v) => updateAssumptions((d) => { d.deployment.siteSurveyHours = v; })} suffix="hr" />
            <NumberField label="Commissioning per live machine" value={a.deployment.commissioningHoursPerMachine} onChange={(v) => updateAssumptions((d) => { d.deployment.commissioningHoursPerMachine = v; })} suffix="hr" />
            <NumberField label="Hours per additional zone" value={a.deployment.hoursPerAdditionalZone} onChange={(v) => updateAssumptions((d) => { d.deployment.hoursPerAdditionalZone = v; })} suffix="hr" step={0.25} />
            <NumberField label="Hours per crossing" value={a.deployment.hoursPerCrossing} onChange={(v) => updateAssumptions((d) => { d.deployment.hoursPerCrossing = v; })} suffix="hr" step={0.25} />
            <NumberField label="Install materials per machine" value={a.deployment.installMaterialsPerMachine} onChange={(v) => updateAssumptions((d) => { d.deployment.installMaterialsPerMachine = v; })} suffix="$" />
            <NumberField label="Charging station" value={a.deployment.chargingStationCost} onChange={(v) => updateAssumptions((d) => { d.deployment.chargingStationCost = v; })} suffix="$" />
            <NumberField label="RTK base station" value={a.deployment.rtkBaseStationCost} onChange={(v) => updateAssumptions((d) => { d.deployment.rtkBaseStationCost = v; })} suffix="$" />
            <NumberField label="Mobilization" value={a.deployment.mobilizationCost} onChange={(v) => updateAssumptions((d) => { d.deployment.mobilizationCost = v; })} suffix="$" />
          </FieldGrid>
        </Card>

        <Card title="Season">
          <FieldGrid cols={2}>
            <NumberField label="Mowing season" value={a.season.mowingSeasonWeeks} onChange={(v) => updateAssumptions((d) => { d.season.mowingSeasonWeeks = v; })} suffix="weeks" />
            <NumberField label="Operating days per week" value={a.season.operatingDaysPerWeek} onChange={(v) => updateAssumptions((d) => { d.season.operatingDaysPerWeek = v; })} suffix="days" />
            <NumberField label="Operating hours per day" value={a.season.operatingHoursPerDay} onChange={(v) => updateAssumptions((d) => { d.season.operatingHoursPerDay = v; })} suffix="hr" />
            <NumberField label="Season start month" value={a.season.seasonStartMonth} onChange={(v) => updateAssumptions((d) => { d.season.seasonStartMonth = v; })} min={1} max={12} step={1} />
          </FieldGrid>
        </Card>

        <Card title="Pricing and termination risk" className="lg:col-span-2">
          <FieldGrid cols={4}>
            <NumberField label="Value pricing savings" value={a.pricing.valueSavingsPct} onChange={(v) => updateAssumptions((d) => { d.pricing.valueSavingsPct = v; })} suffix="%" step={0.5} />
            <NumberField label="Volume / switcher savings" value={a.pricing.volumeSwitcherSavingsPct} onChange={(v) => updateAssumptions((d) => { d.pricing.volumeSwitcherSavingsPct = v; })} suffix="%" step={0.5} />
            <NumberField label="Premium pilot savings" value={a.pricing.premiumPilotSavingsPct} onChange={(v) => updateAssumptions((d) => { d.pricing.premiumPilotSavingsPct = v; })} suffix="%" step={0.5} help="Negative means a premium." />
            <NumberField label="Short-term rate uplift" value={a.pricing.shortTermRateUpliftPct} onChange={(v) => updateAssumptions((d) => { d.pricing.shortTermRateUpliftPct = v; })} suffix="%" />
            <NumberField label="Multi-season discount / season" value={a.pricing.multiSeasonDiscountPctPerSeason} onChange={(v) => updateAssumptions((d) => { d.pricing.multiSeasonDiscountPctPerSeason = v; })} suffix="%" step={0.5} />
            <NumberField label="Max multi-season discount" value={a.pricing.maxMultiSeasonDiscountPct} onChange={(v) => updateAssumptions((d) => { d.pricing.maxMultiSeasonDiscountPct = v; })} suffix="%" />
            <NumberField label="Early-termination charge collectibility" value={a.pricing.earlyTerminationChargeCollectibilityPct} onChange={(v) => updateAssumptions((d) => { d.pricing.earlyTerminationChargeCollectibilityPct = v; })} suffix="%" />
          </FieldGrid>
          <div className="mt-4 border-t border-ink-100 pt-4">
            <h3 className="label-caps mb-2">Termination probability by contract structure</h3>
            <FieldGrid cols={4}>
              {CONTRACT_STRUCTURES.map((s) => (
                <NumberField
                  key={s}
                  label={CONTRACT_STRUCTURE_LABELS[s]}
                  value={a.pricing.terminationProbabilityPct[s]}
                  onChange={(v) =>
                    updateAssumptions((d) => {
                      d.pricing.terminationProbabilityPct[s] = v;
                    })
                  }
                  suffix="%"
                  min={0}
                  max={100}
                />
              ))}
            </FieldGrid>
          </div>
        </Card>

        <Card title="Cluster scoring" className="lg:col-span-2">
          <FieldGrid cols={4}>
            <NumberField label="Dense distance" value={a.cluster.denseDistanceMiles} onChange={(v) => updateAssumptions((d) => { d.cluster.denseDistanceMiles = v; })} suffix="mi" />
            <NumberField label="Isolated distance" value={a.cluster.isolatedDistanceMiles} onChange={(v) => updateAssumptions((d) => { d.cluster.isolatedDistanceMiles = v; })} suffix="mi" />
            <NumberField label="Dense machine count" value={a.cluster.denseMachineCount} onChange={(v) => updateAssumptions((d) => { d.cluster.denseMachineCount = v; })} />
            <NumberField label="Building machine count" value={a.cluster.buildingMachineCount} onChange={(v) => updateAssumptions((d) => { d.cluster.buildingMachineCount = v; })} />
            <NumberField label="Dense score min" value={a.cluster.denseScoreMin} onChange={(v) => updateAssumptions((d) => { d.cluster.denseScoreMin = v; })} />
            <NumberField label="Building score min" value={a.cluster.buildingScoreMin} onChange={(v) => updateAssumptions((d) => { d.cluster.buildingScoreMin = v; })} />
            <NumberField label="Weight: 5 mi" value={a.cluster.radiusWeights.r5} onChange={(v) => updateAssumptions((d) => { d.cluster.radiusWeights.r5 = v; })} step={0.01} />
            <NumberField label="Weight: 10 mi" value={a.cluster.radiusWeights.r10} onChange={(v) => updateAssumptions((d) => { d.cluster.radiusWeights.r10 = v; })} step={0.01} />
            <NumberField label="Weight: 15 mi" value={a.cluster.radiusWeights.r15} onChange={(v) => updateAssumptions((d) => { d.cluster.radiusWeights.r15 = v; })} step={0.01} />
            <NumberField label="Weight: 25 mi" value={a.cluster.radiusWeights.r25} onChange={(v) => updateAssumptions((d) => { d.cluster.radiusWeights.r25 = v; })} step={0.01} />
            <NumberField label="Weight: 50 mi" value={a.cluster.radiusWeights.r50} onChange={(v) => updateAssumptions((d) => { d.cluster.radiusWeights.r50 = v; })} step={0.01} />
          </FieldGrid>
        </Card>
      </div>
    </>
  );
}
